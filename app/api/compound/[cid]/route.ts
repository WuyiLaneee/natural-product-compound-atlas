import { isDatabaseUnavailableError } from "@/db";
import { getCatalogEntryByPubchemCid } from "@/lib/catalog";
import { aggregateCompoundEvidence, inferEvidenceLevel } from "@/lib/evidence/aggregate";
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
} from "@/lib/evidence/types";
import {
  consumeRateLimit,
  getCachedSourceRecord,
  upsertCachedSourceRecord,
} from "@/lib/storage";

export const runtime = "edge";

const CACHE_SOURCE = "evidence_aggregate";
const CACHE_VERSION = "v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "127.0.0.1";
}

function hasText(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

function sourceMessage(result: SourceResult<unknown, unknown>): string | undefined {
  if (!result.errors.length) {
    return result.truncated ? "已达到本次检索上限；可在原始数据库继续核对。" : undefined;
  }
  const message = result.errors.map((error) => {
    if (error.code === "missing_credentials") return "生产凭据尚未配置；该来源已跳过。";
    if (/<!doctype\s+html|<html[\s>]/i.test(error.message)) return "上游接口暂时返回服务错误；该来源本次未计入。";
    return error.message;
  }).join("；");
  return message.length > 260 ? `${message.slice(0, 257)}…` : message;
}

function mapSource(source: string, result: SourceResult<unknown, unknown>) {
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

function mapPublication(record: PublicationRecord) {
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

function mapPatent(record: PatentRecord) {
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

function mapTrial(record: ClinicalTrialRecord) {
  return {
    id: record.nctId,
    title: record.officialTitle ?? record.briefTitle,
    status: record.overallStatus,
    phase: record.phases.join(" / ") || undefined,
    conditions: record.conditions,
    enrollment: record.enrollment,
    intervention: record.interventions.map((item) => item.name).join(" / ") || undefined,
    resultsAvailable: record.hasResults,
    url: record.sourceUrl,
  };
}

function activityEvidenceLevel(record: ChEMBLActivity): EvidenceLevel {
  const inferred = inferEvidenceLevel([
    record.assayDescription,
    record.activityComment,
    record.standardType,
  ].filter(Boolean).join(" "));
  if (inferred === "T1") return "T1";

  const targetType = record.target?.targetType?.toUpperCase() ?? "";
  const isMolecularTarget = /SINGLE PROTEIN|PROTEIN COMPLEX|PROTEIN FAMILY|SELECTIVITY GROUP/.test(targetType);
  return isMolecularTarget ? "T2" : "T4";
}

function mapActivity(record: ChEMBLActivity) {
  return {
    id: String(record.activityId),
    targetName: record.target?.preferredName ?? "靶点未标准化",
    targetOrganism: record.target?.organism,
    targetType: record.target?.targetType,
    assayType: [record.assayType, record.target?.targetType].filter(Boolean).join(" · ") || undefined,
    standardType: record.standardType,
    standardValue: record.standardValue ?? record.standardTextValue,
    standardUnits: record.standardUnits,
    pchemblValue: record.pchemblValue,
    evidenceLevel: activityEvidenceLevel(record),
    documentUrl: record.sourceUrl,
  };
}

function mapClaim(record: EvidenceClaim, index: number) {
  const kind = record.claimType === "target"
    ? "target"
    : record.claimType === "mechanism"
      ? "mechanism"
      : "effect";
  return {
    id: `${record.source.source}:${record.source.sourceId}:${index}`,
    kind,
    label: record.summary,
    target: record.target,
    direction: record.direction,
    evidenceLevel: record.evidenceLevel,
    model: [record.modelType, record.induction, record.intervention].filter(Boolean).join(" · ") || undefined,
    organism: record.species,
    dose: record.dose,
    endpoint: record.endpoints.join("；") || undefined,
    snippet: record.source.excerpt,
    sourceTitle: `${record.source.source} · ${record.source.sourceId}`,
    sourceUrl: record.source.sourceUrl,
    reviewStatus: "机器抽取 · 未审核",
    isPredicted: record.evidenceLevel === "T5",
  };
}

function mapPayload(aggregation: EvidenceAggregation, fallback: CompoundProfile) {
  const compound = aggregation.compound ?? fallback;
  const sourceResults = aggregation.sources;
  const degraded = Object.values(sourceResults).filter((source) => source.status !== "success").length;

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
      mapSource("PubChem", sourceResults.pubchem),
      mapSource("ChEMBL", sourceResults.chembl),
      mapSource("Europe PMC", sourceResults.europePmc),
      mapSource("ClinicalTrials.gov", sourceResults.clinicalTrials),
      mapSource("EPO OPS", sourceResults.epoOps),
      mapSource("机器抽取", sourceResults.model),
    ],
    literature: aggregation.publications.map(mapPublication),
    patents: aggregation.patents.map(mapPatent),
    trials: aggregation.trials.map(mapTrial),
    bioactivities: aggregation.bioactivities.map(mapActivity),
    claims: aggregation.claims.map(mapClaim),
    coverageNote: `结果生成于 ${new Date(aggregation.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}；覆盖当前列明数据库与接口权限范围${degraded ? `，${degraded} 个来源为部分、跳过或错误状态` : ""}。记录召回不等于功效成立，机器抽取未经人工审核。`,
  };
}

function isCachedPayload(value: unknown, cid: number): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const compound = (value as { compound?: unknown }).compound;
  return Boolean(compound && typeof compound === "object" && (compound as { cid?: unknown }).cid === cid);
}

async function readCache(cid: number): Promise<Record<string, unknown> | null> {
  try {
    const cached = await getCachedSourceRecord(CACHE_SOURCE, `${CACHE_VERSION}:${cid}`);
    return cached && isCachedPayload(cached.record.payload, cid) ? cached.record.payload : null;
  } catch (error) {
    if (isDatabaseUnavailableError(error) || process.env.NODE_ENV !== "production") return null;
    throw error;
  }
}

async function writeCache(cid: number, payload: Record<string, unknown>): Promise<void> {
  try {
    await upsertCachedSourceRecord({
      source: CACHE_SOURCE,
      externalId: `${CACHE_VERSION}:${cid}`,
      recordType: "compound_evidence_aggregate",
      payload,
      ttlMs: CACHE_TTL_MS,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error) || process.env.NODE_ENV !== "production") return;
    throw error;
  }
}

async function enforceRefreshLimit(request: Request) {
  try {
    return await consumeRateLimit({
      bucketKey: "uncached-evidence-refresh",
      ipAddress: clientIp(request),
      salt: process.env.RATE_LIMIT_SALT || "local-ginsenoside-development",
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error) || process.env.NODE_ENV !== "production") return null;
    throw error;
  }
}

export async function GET(request: Request, context: { params: Promise<{ cid: string }> }) {
  const { cid: rawCid } = await context.params;
  if (!/^\d+$/.test(rawCid)) return Response.json({ error: "PubChem CID 格式无效" }, { status: 400 });

  const cid = Number(rawCid);
  const entry = getCatalogEntryByPubchemCid(cid);
  if (!entry || !entry.pubchemCid || !entry.pubchemInchiKey) {
    return Response.json({ error: "首版仅支持目录内已核验的人参皂苷单体" }, { status: 404 });
  }

  const cached = await readCache(cid);
  if (cached) {
    return Response.json(cached, {
      headers: { "cache-control": "public, max-age=300, s-maxage=3600", "x-evidence-cache": "hit" },
    });
  }

  const rate = await enforceRefreshLimit(request);
  if (rate && !rate.allowed) {
    return Response.json(
      { error: "实时证据刷新频率过高，请在限流窗口结束后重试。", resetAt: new Date(rate.resetAt).toISOString() },
      { status: 429, headers: { "retry-after": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } },
    );
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() || entry.displayNameEn;
  const compound = {
    cid,
    title: entry.displayNameEn,
    inchiKey: entry.pubchemInchiKey,
    pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
  };
  const epo = hasText(process.env.EPO_CLIENT_ID) && hasText(process.env.EPO_CLIENT_SECRET)
    ? { clientId: process.env.EPO_CLIENT_ID, clientSecret: process.env.EPO_CLIENT_SECRET }
    : undefined;
  const model = hasText(process.env.MODEL_API_BASE_URL)
    && hasText(process.env.MODEL_API_KEY)
    && hasText(process.env.MODEL_NAME)
    ? {
        baseUrl: process.env.MODEL_API_BASE_URL,
        apiKey: process.env.MODEL_API_KEY,
        model: process.env.MODEL_NAME,
        maxDocuments: 50,
      }
    : undefined;

  try {
    const aggregation = await aggregateCompoundEvidence({
      query,
      compound,
      aliases: [entry.displayNameZh, entry.displayNameEn, ...entry.aliases],
      epo,
      model,
      timeoutMs: 15_000,
      limits: {
        pubchemPatents: 100,
        chemblActivities: 100,
        publications: 50,
        trials: 25,
        patents: 50,
        patentFullText: 5,
        modelDocuments: 50,
      },
    });
    const fallback: CompoundProfile = {
      ...compound,
      synonyms: [entry.displayNameZh, entry.displayNameEn, ...entry.aliases],
      patentReferences: [],
      patentReferenceCount: 0,
    };
    const payload = mapPayload(aggregation, fallback);
    await writeCache(cid, payload as unknown as Record<string, unknown>);
    return Response.json(payload, {
      headers: { "cache-control": "public, max-age=300, s-maxage=3600", "x-evidence-cache": "miss" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知聚合错误";
    return Response.json({ error: `证据聚合失败：${message}` }, { status: 502 });
  }
}
