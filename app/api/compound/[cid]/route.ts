import { isDatabaseUnavailableError } from "@/db";
import { aggregateCompoundEvidence, inferEvidenceLevel } from "@/lib/evidence/aggregate";
import {
  COMPOUND_EVIDENCE_CACHE_SOURCE,
  COMPOUND_EVIDENCE_CACHE_TTL_MS,
  COMPOUND_REFRESH_RATE_BUCKET,
  chineseRegistryCandidate,
  compoundEvidenceCacheId,
  parsePubChemCid,
} from "@/lib/evidence/compound-api";
import { findChineseCompoundByCid } from "@/lib/evidence/chinese-compounds";
import {
  buildPubChemEntityNote,
  resolvePubChemCompound,
} from "@/lib/evidence/sources/pubchem";
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
  const isPubMedRecord = record.source.source === "europe_pmc";
  const pmid = isPubMedRecord && /^\d{5,9}$/.test(record.source.sourceId)
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
    model: [record.modelType, record.induction, record.intervention].filter(Boolean).join(" · ") || undefined,
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
    reviewStatus: record.modelName === "pubmed_rule_v1"
      ? "PubMed 文献筛选"
      : "AI 辅助整理",
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
      iupacName: compound.iupacName,
      molecularFormula: compound.molecularFormula,
      molecularWeight: compound.molecularWeight,
      charge: compound.charge,
      covalentUnitCount: compound.covalentUnitCount,
      definedAtomStereoCount: compound.definedAtomStereoCount,
      undefinedAtomStereoCount: compound.undefinedAtomStereoCount,
      inchiKey: compound.inchiKey,
      isomericSmiles: compound.isomericSmiles,
      synonyms: compound.synonyms,
      entityNote: buildPubChemEntityNote(compound),
      structureUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.cid}/PNG?record_type=2d`,
    },
    sources: [
      mapSource("PubChem", sourceResults.pubchem),
      mapSource("ChEMBL", sourceResults.chembl),
      mapSource("PubMed / Europe PMC", sourceResults.europePmc),
      mapSource("ClinicalTrials.gov", sourceResults.clinicalTrials),
      mapSource("EPO OPS", sourceResults.epoOps),
      mapSource("智能解析", sourceResults.model),
    ],
    literature: aggregation.publications.map(mapPublication),
    patents: aggregation.patents.map(mapPatent),
    trials: aggregation.trials.map(mapTrial),
    bioactivities: aggregation.bioactivities.map(mapActivity),
    claims: aggregation.claims.map(mapClaim),
    coverageNote: `结果生成于 ${new Date(aggregation.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}；已汇聚当前接入数据库的可用科研信息${degraded ? `，${degraded} 个来源正在等待更新或扩展接入` : ""}。`,
  };
}

function isCachedPayload(value: unknown, cid: number): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const compound = (value as { compound?: unknown }).compound;
  return Boolean(compound && typeof compound === "object" && (compound as { cid?: unknown }).cid === cid);
}

async function readCache(cid: number): Promise<Record<string, unknown> | null> {
  try {
    const cached = await getCachedSourceRecord(
      COMPOUND_EVIDENCE_CACHE_SOURCE,
      compoundEvidenceCacheId(cid),
    );
    return cached && isCachedPayload(cached.record.payload, cid) ? cached.record.payload : null;
  } catch (error) {
    if (isDatabaseUnavailableError(error) || process.env.NODE_ENV !== "production") return null;
    throw error;
  }
}

async function writeCache(cid: number, payload: Record<string, unknown>): Promise<void> {
  try {
    await upsertCachedSourceRecord({
      source: COMPOUND_EVIDENCE_CACHE_SOURCE,
      externalId: compoundEvidenceCacheId(cid),
      recordType: "pubchem_compound_evidence_aggregate",
      payload,
      ttlMs: COMPOUND_EVIDENCE_CACHE_TTL_MS,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error) || process.env.NODE_ENV !== "production") return;
    throw error;
  }
}

async function enforceRefreshLimit(request: Request) {
  try {
    return await consumeRateLimit({
      bucketKey: COMPOUND_REFRESH_RATE_BUCKET,
      ipAddress: clientIp(request),
      salt: process.env.RATE_LIMIT_SALT || "local-natural-compound-development",
      limit: 12,
      windowMs: 60 * 60 * 1000,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error) || process.env.NODE_ENV !== "production") return null;
    throw error;
  }
}

export async function GET(request: Request, context: { params: Promise<{ cid: string }> }) {
  const { cid: rawCid } = await context.params;
  const cid = parsePubChemCid(rawCid);
  if (cid === null) return Response.json({ error: "PubChem CID 格式无效" }, { status: 400 });

  const cached = await readCache(cid);
  if (cached) {
    return Response.json(cached, {
      headers: { "cache-control": "public, max-age=300, s-maxage=3600", "x-evidence-cache": "hit" },
    });
  }

  const rate = await enforceRefreshLimit(request);
  if (rate && !rate.allowed) {
    return Response.json(
      { error: "科研数据更新请求较多，请稍后重试。", resetAt: new Date(rate.resetAt).toISOString() },
      { status: 429, headers: { "retry-after": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } },
    );
  }

  // CID is the sole identity and cache key. The optional page-level `q`
  // parameter is deliberately never read, so a display query cannot alter
  // evidence retrieval or poison another compound's cached payload.
  const resolution = await resolvePubChemCompound(String(cid), {
    timeoutMs: 20_000,
    maxRecords: 1,
  });
  const localEntry = findChineseCompoundByCid(cid);
  const compound = resolution.status === "resolved" && resolution.selected
    ? resolution.selected
    : resolution.source.status === "error" && localEntry
      ? chineseRegistryCandidate(localEntry)
      : undefined;
  if (!compound && resolution.source.status === "error") {
    return Response.json(
      {
        status: "unavailable",
        error: "PubChem 化合物身份解析暂时不可用，请稍后重试。",
      },
      { status: 502 },
    );
  }
  if (!compound) {
    return Response.json({ error: `PubChem CID ${cid} 不存在或未返回化合物记录。` }, { status: 404 });
  }
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
      query: String(cid),
      compound,
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
      synonyms: [compound.title],
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
    return Response.json({ error: `科研数据汇聚暂未完成：${message}` }, { status: 502 });
  }
}
