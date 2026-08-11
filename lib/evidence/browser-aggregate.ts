import { getCatalogEntryByPubchemCid } from "../catalog";
import { aggregateCompoundEvidence, inferEvidenceLevel } from "./aggregate";
import {
  readBrowserCache,
  removeBrowserCache,
  writeBrowserCache,
  type BrowserCacheStorage,
} from "./browser-cache";
import { createBrowserFetchImpl } from "./browser-fetch";
import type {
  ChEMBLActivity,
  ClinicalTrialRecord,
  CompoundProfile,
  EvidenceAggregation,
  EvidenceClaim,
  EvidenceLevel,
  PatentRecord,
  PublicationRecord,
  SourceResult,
} from "./types";

export const BROWSER_EVIDENCE_CACHE_VERSION = "v1-pubmed-effects";
export const BROWSER_EVIDENCE_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;

const DEFAULT_LIMITS = {
  pubchemPatents: 100,
  chemblActivities: 100,
  publications: 50,
  trials: 25,
  patents: 50,
  patentFullText: 0,
  modelDocuments: 0,
} as const;

export type BrowserSourceStatus = "success" | "partial" | "skipped" | "error";

export interface BrowserCompoundPayload {
  compound: {
    cid: number;
    title: string;
    molecularFormula?: string;
    molecularWeight?: number;
    inchiKey?: string;
    isomericSmiles?: string;
    synonyms: string[];
    structureUrl: string;
  };
  sources: Array<{
    source: string;
    status: BrowserSourceStatus;
    count: number;
    message?: string;
    fetchedAt: string;
  }>;
  literature: Array<{
    id: string;
    title: string;
    authors: string[];
    year?: number;
    journal?: string;
    doi?: string;
    pmid?: string;
    abstract?: string;
    url: string;
    studyType: string;
    fullTextStatus: string;
  }>;
  patents: Array<{
    id: string;
    title: string;
    publicationNumber: string;
    applicant?: string;
    priorityDate?: string;
    relation: "P-claim" | "P-example" | "P-mention";
    legalStatus?: string;
    abstract?: string;
    url: string;
    familyId?: string;
  }>;
  trials: Array<{
    id: string;
    title: string;
    status?: string;
    phase?: string;
    conditions: string[];
    enrollment?: number;
    intervention?: string;
    resultsAvailable: boolean;
    url: string;
  }>;
  bioactivities: Array<{
    id: string;
    targetName: string;
    targetOrganism?: string;
    targetType?: string;
    assayType?: string;
    standardType?: string;
    standardValue?: number | string;
    standardUnits?: string;
    pchemblValue?: number;
    confidenceScore?: number;
    evidenceLevel: EvidenceLevel;
    documentUrl: string;
  }>;
  claims: Array<{
    id: string;
    kind: "effect" | "target" | "mechanism";
    label: string;
    effect?: string;
    target?: string;
    direction?: EvidenceClaim["direction"];
    evidenceLevel: EvidenceLevel;
    model?: string;
    organism?: string;
    dose?: string;
    endpoint?: string;
    snippet: string;
    sourceLocator: string;
    source: string;
    sourceId: string;
    pmid?: string;
    sourceTitle: string;
    sourceUrl?: string;
    reviewStatus: string;
    isPredicted: boolean;
  }>;
  coverageNote: string;
}

export interface BrowserAggregateOptions {
  /** Ignore a fresh cache entry and query the public sources again. */
  forceRefresh?: boolean;
  /** Base fetch used by tests or browser polyfills; unsafe headers are stripped. */
  fetchImpl?: typeof fetch;
  /** Defaults to localStorage, with an automatic module-memory fallback. */
  storage?: BrowserCacheStorage;
  timeoutMs?: number;
  /** Cancels in-flight public API requests when the result view unmounts. */
  signal?: AbortSignal;
  /** Injectable clock for deterministic cache tests. */
  now?: () => number;
}

export class BrowserEvidenceError extends Error {
  readonly code: "invalid_cid" | "unsupported_compound" | "aggregate_failed";

  constructor(
    message: string,
    code: BrowserEvidenceError["code"],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BrowserEvidenceError";
    this.code = code;
  }
}

function cacheKey(cid: number): string {
  return `ginsenoside-evidence:${BROWSER_EVIDENCE_CACHE_VERSION}:${cid}`;
}

function isBrowserCompoundPayload(
  value: unknown,
  expectedCid: number,
): value is BrowserCompoundPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BrowserCompoundPayload>;
  return Boolean(
    candidate.compound &&
      candidate.compound.cid === expectedCid &&
      Array.isArray(candidate.sources) &&
      Array.isArray(candidate.literature) &&
      Array.isArray(candidate.patents) &&
      Array.isArray(candidate.trials) &&
      Array.isArray(candidate.bioactivities) &&
      Array.isArray(candidate.claims),
  );
}

function sourceMessage(result: SourceResult<unknown, unknown>): string | undefined {
  if (!result.errors.length) {
    return result.truncated ? "已达到本次检索上限；可前往原始数据库继续查看。" : undefined;
  }
  const message = result.errors
    .map((error) => {
      if (error.code === "missing_credentials") {
        return "凭据型扩展服务仅在腾讯云正式入口启用。";
      }
      if (/<!doctype\s+html|<html[\s>]/i.test(error.message)) {
        return "上游接口暂时返回服务错误；该来源本次未计入。";
      }
      return error.message;
    })
    .join("；");
  return message.length > 260 ? `${message.slice(0, 257)}…` : message;
}

function mapSource(
  source: string,
  result: SourceResult<unknown, unknown>,
): BrowserCompoundPayload["sources"][number] {
  return {
    source,
    status: result.status,
    count: result.records.length,
    message: sourceMessage(result),
    fetchedAt: result.fetchedAt,
  };
}

function fullTextLabel(record: PublicationRecord): string {
  const labels = {
    open_pdf: "开放 PDF",
    html_not_pdf: "开放全文",
    needs_institution: "需机构权限",
    no_open_pdf: "无开放 PDF",
    unknown: "全文状态未知",
  } as const;
  return labels[record.fullTextStatus];
}

function mapPublication(
  record: PublicationRecord,
): BrowserCompoundPayload["literature"][number] {
  return {
    id: record.id,
    title: record.title,
    authors: record.authors,
    year: record.year,
    journal: record.journal,
    doi: record.doi,
    pmid: record.pmid,
    abstract: record.abstract,
    url: record.sourceUrl,
    studyType: record.publicationTypes[0] ?? "文献",
    fullTextStatus: fullTextLabel(record),
  };
}

function mapPatent(record: PatentRecord): BrowserCompoundPayload["patents"][number] {
  const relation = {
    claim: "P-claim",
    example: "P-example",
    mention: "P-mention",
  } as const;
  return {
    id: `${record.familyId ?? "publication"}:${record.publicationNumber}`,
    title: record.title ?? record.publicationNumber,
    publicationNumber: record.publicationNumber,
    applicant: record.applicants[0],
    priorityDate: record.publicationDate,
    relation: relation[record.relationship],
    abstract: record.abstract ?? record.evidenceExcerpt,
    url: record.sourceUrl,
    familyId: record.familyId,
  };
}

function mapTrial(
  record: ClinicalTrialRecord,
): BrowserCompoundPayload["trials"][number] {
  return {
    id: record.nctId,
    title: record.officialTitle ?? record.briefTitle,
    status: record.overallStatus,
    phase: record.phases.join(" / ") || undefined,
    conditions: record.conditions,
    enrollment: record.enrollment,
    intervention:
      record.interventions.map((item) => item.name).join(" / ") || undefined,
    resultsAvailable: record.hasResults,
    url: record.sourceUrl,
  };
}

function activityEvidenceLevel(record: ChEMBLActivity): EvidenceLevel {
  const inferred = inferEvidenceLevel(
    [record.assayDescription, record.activityComment, record.standardType]
      .filter(Boolean)
      .join(" "),
  );
  if (inferred === "T1") return "T1";

  const targetType = record.target?.targetType?.toUpperCase() ?? "";
  const isMolecularTarget =
    /SINGLE PROTEIN|PROTEIN COMPLEX|PROTEIN FAMILY|SELECTIVITY GROUP/.test(
      targetType,
    );
  return isMolecularTarget ? "T2" : "T4";
}

function mapActivity(
  record: ChEMBLActivity,
): BrowserCompoundPayload["bioactivities"][number] {
  return {
    id: String(record.activityId),
    targetName: record.target?.preferredName ?? "靶点未标准化",
    targetOrganism: record.target?.organism,
    targetType: record.target?.targetType,
    assayType:
      [record.assayType, record.target?.targetType].filter(Boolean).join(" · ") ||
      undefined,
    standardType: record.standardType,
    standardValue: record.standardValue ?? record.standardTextValue,
    standardUnits: record.standardUnits,
    pchemblValue: record.pchemblValue,
    confidenceScore: (
      record as ChEMBLActivity & { confidenceScore?: number }
    ).confidenceScore,
    evidenceLevel: activityEvidenceLevel(record),
    documentUrl: record.sourceUrl,
  };
}

function mapClaim(
  record: EvidenceClaim,
  index: number,
): BrowserCompoundPayload["claims"][number] {
  const kind =
    record.claimType === "target"
      ? "target"
      : record.claimType === "mechanism"
        ? "mechanism"
        : "effect";
  const isPubMedRecord = record.source.source === "europe_pmc";
  const pmid =
    isPubMedRecord && /^\d{5,9}$/.test(record.source.sourceId)
      ? record.source.sourceId
      : undefined;
  return {
    id: `${record.source.source}:${record.source.sourceId}:${index}`,
    kind,
    label: record.summary,
    effect: record.effect,
    target: record.target,
    direction: record.direction,
    evidenceLevel: record.evidenceLevel,
    model:
      [record.modelType, record.induction, record.intervention]
        .filter(Boolean)
        .join(" · ") || undefined,
    organism: record.species,
    dose: record.dose,
    endpoint: record.endpoints.join("；") || undefined,
    snippet: record.source.excerpt,
    sourceLocator: record.source.locator,
    source: record.source.source,
    sourceId: record.source.sourceId,
    pmid,
    sourceTitle: pmid
      ? `PubMed · PMID ${pmid}`
      : `${isPubMedRecord ? "PubMed / Europe PMC" : record.source.source} · ${record.source.sourceId}`,
    sourceUrl: record.source.sourceUrl,
    reviewStatus:
      record.modelName === "pubmed_rule_v1"
        ? "PubMed 文献筛选"
        : "AI 辅助整理",
    isPredicted: record.evidenceLevel === "T5",
  };
}

function mapPayload(
  aggregation: EvidenceAggregation,
  fallback: CompoundProfile,
): BrowserCompoundPayload {
  const compound = aggregation.compound ?? fallback;
  const sources = aggregation.sources;
  const degraded = Object.values(sources).filter(
    (source) => source.status !== "success",
  ).length;

  return {
    compound: {
      cid: compound.cid,
      title: compound.title,
      molecularFormula: compound.molecularFormula,
      molecularWeight: compound.molecularWeight,
      inchiKey: compound.inchiKey,
      isomericSmiles: compound.isomericSmiles,
      synonyms: compound.synonyms,
      structureUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.cid}/PNG?record_type=2d`,
    },
    sources: [
      mapSource("PubChem", sources.pubchem),
      mapSource("ChEMBL", sources.chembl),
      mapSource("PubMed / Europe PMC", sources.europePmc),
      mapSource("ClinicalTrials.gov", sources.clinicalTrials),
      mapSource("EPO OPS", sources.epoOps),
      mapSource("智能解析", sources.model),
    ],
    literature: aggregation.publications.map(mapPublication),
    patents: aggregation.patents.map(mapPatent),
    trials: aggregation.trials.map(mapTrial),
    bioactivities: aggregation.bioactivities.map(mapActivity),
    claims: aggregation.claims.map(mapClaim),
    coverageNote: `结果生成于 ${new Date(aggregation.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}；已汇聚当前接入数据库的可用科研信息${degraded ? `，${degraded} 个来源正在等待更新或扩展接入` : ""}。`,
  };
}

function liveSourceCount(payload: BrowserCompoundPayload): number {
  const browserSources = new Set([
    "PubChem",
    "ChEMBL",
    "PubMed / Europe PMC",
    "ClinicalTrials.gov",
  ]);
  return payload.sources.filter(
    (source) =>
      browserSources.has(source.source) &&
      (source.status === "success" || source.status === "partial"),
  ).length;
}

function stalePayload(
  payload: BrowserCompoundPayload,
  savedAt: number,
): BrowserCompoundPayload {
  const timestamp = new Date(savedAt).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
  });
  return {
    ...payload,
    coverageNote: `当前数据源连接暂不稳定，正在显示 ${timestamp} 保存的检索结果。`,
  };
}

function withCallerSignal(
  baseFetch: typeof fetch,
  callerSignal: AbortSignal | undefined,
): typeof fetch {
  if (!callerSignal) return baseFetch;

  return async (input, init = {}) => {
    const requestSignal = init.signal;
    if (!requestSignal || requestSignal === callerSignal) {
      return baseFetch(input, { ...init, signal: callerSignal });
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    requestSignal.addEventListener("abort", abort, { once: true });
    callerSignal.addEventListener("abort", abort, { once: true });
    if (requestSignal.aborted || callerSignal.aborted) controller.abort();

    try {
      return await baseFetch(input, { ...init, signal: controller.signal });
    } finally {
      requestSignal.removeEventListener("abort", abort);
      callerSignal.removeEventListener("abort", abort);
    }
  };
}

function makeAbortError(): Error {
  if (typeof DOMException === "function") {
    return new DOMException("The operation was aborted.", "AbortError");
  }
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

/**
 * Aggregates a catalog-confirmed ginsenoside directly from public browser APIs.
 *
 * EPO OPS and model extraction intentionally receive no credentials and are
 * therefore returned as `skipped`. All identity-sensitive lookups still use
 * the curated CID, complete InChIKey and the aggregate layer's stereoisomer
 * alias filter. A fresh result is cached for six hours in localStorage (or in
 * memory when storage is unavailable).
 */
export async function aggregateBrowserCompoundEvidence(
  cid: number,
  options: BrowserAggregateOptions = {},
): Promise<BrowserCompoundPayload> {
  if (!Number.isSafeInteger(cid) || cid <= 0) {
    throw new BrowserEvidenceError("PubChem CID 格式无效", "invalid_cid");
  }

  const entry = getCatalogEntryByPubchemCid(cid);
  if (!entry?.pubchemCid || !entry.pubchemInchiKey) {
    throw new BrowserEvidenceError(
      "首版仅支持目录内已核验的人参皂苷单体",
      "unsupported_compound",
    );
  }

  const now = options.now?.() ?? Date.now();
  const key = cacheKey(cid);
  const cached = readBrowserCache({
    key,
    schemaVersion: BROWSER_EVIDENCE_CACHE_VERSION,
    storage: options.storage,
    validatePayload: (payload): payload is BrowserCompoundPayload =>
      isBrowserCompoundPayload(payload, cid),
  });
  if (!options.forceRefresh && cached && cached.expiresAt > now) {
    return cached.payload;
  }

  const compound = {
    cid,
    title: entry.displayNameEn,
    inchiKey: entry.pubchemInchiKey,
    pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
  };
  const fallback: CompoundProfile = {
    ...compound,
    synonyms: [entry.displayNameZh, entry.displayNameEn, ...entry.aliases],
    patentReferences: [],
    patentReferenceCount: 0,
  };

  try {
    const aggregation = await aggregateCompoundEvidence({
      query: entry.displayNameEn,
      compound,
      aliases: [entry.displayNameZh, entry.displayNameEn, ...entry.aliases],
      timeoutMs: options.timeoutMs ?? 15_000,
      fetchImpl: createBrowserFetchImpl(
        withCallerSignal(options.fetchImpl ?? globalThis.fetch, options.signal),
      ),
      limits: DEFAULT_LIMITS,
      // No EPO credentials or model configuration are ever placed in a static
      // browser bundle. The shared aggregate layer reports both as skipped.
      epo: undefined,
      model: undefined,
    });
    if (options.signal?.aborted) throw makeAbortError();
    const payload = mapPayload(aggregation, fallback);

    if (cached && liveSourceCount(payload) === 0) {
      return stalePayload(cached.payload, cached.savedAt);
    }

    writeBrowserCache({
      key,
      schemaVersion: BROWSER_EVIDENCE_CACHE_VERSION,
      payload,
      ttlMs: BROWSER_EVIDENCE_CACHE_TTL_MS,
      now,
      storage: options.storage,
    });
    return payload;
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error instanceof Error ? error : makeAbortError();
    }
    if (cached) return stalePayload(cached.payload, cached.savedAt);
    throw new BrowserEvidenceError(
      `科研数据汇聚暂未完成：${error instanceof Error ? error.message : "未知聚合错误"}`,
      "aggregate_failed",
      { cause: error },
    );
  }
}

export function clearBrowserCompoundEvidenceCache(
  cid: number,
  storage?: BrowserCacheStorage,
): void {
  removeBrowserCache(cacheKey(cid), storage);
}
