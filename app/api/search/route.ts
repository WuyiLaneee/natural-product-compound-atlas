import { isDatabaseUnavailableError } from "@/db";
import {
  COMPOUND_SEARCH_RATE_BUCKET,
  requiresStructureConfirmation,
  toSearchCandidate,
} from "@/lib/evidence/compound-api";
import { resolveChineseCompoundName } from "@/lib/evidence/chinese-compounds";
import { resolvePubChemCompound } from "@/lib/evidence/sources/pubchem";
import { consumeRateLimit } from "@/lib/storage";

function clientIp(request: Request): string {
  const headers = request.headers;
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

async function enforceRateLimit(request: Request) {
  try {
    const decision = await consumeRateLimit({
      bucketKey: COMPOUND_SEARCH_RATE_BUCKET,
      ipAddress: clientIp(request),
      salt: process.env.RATE_LIMIT_SALT || "local-natural-compound-development",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    return decision;
  } catch (error) {
    if (isDatabaseUnavailableError(error) || process.env.NODE_ENV !== "production") return null;
    throw error;
  }
}

export async function POST(request: Request) {
  let payload: { query?: unknown };
  try { payload = await request.json() as { query?: unknown }; }
  catch { return Response.json({ error: "请求必须是有效 JSON" }, { status: 400 }); }

  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  if (!query || query.length > 160) {
    return Response.json(
      { error: "请输入 1–160 个字符的已收录中文名、英文名、CAS、PubChem CID 或完整 InChIKey" },
      { status: 400 },
    );
  }

  const rate = await enforceRateLimit(request);
  if (rate && !rate.allowed) {
    return Response.json(
      { error: "检索频率过高，请稍后再试", resetAt: new Date(rate.resetAt).toISOString() },
      { status: 429, headers: { "retry-after": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } },
    );
  }

  const chineseMatch = resolveChineseCompoundName(query);
  const interpretedQuery = chineseMatch?.englishName ?? query;
  const queryInterpretation = {
    interpretedQuery,
    ...(chineseMatch ? { matchedChineseName: chineseMatch.labelZh } : {}),
  };

  const resolution = await resolvePubChemCompound(interpretedQuery, {
    timeoutMs: 12_000,
    maxRecords: 12,
  });
  const candidates = resolution.candidates.map(toSearchCandidate);

  if (resolution.source.status === "error") {
    return Response.json({
      status: "unavailable",
      error: "PubChem 化合物解析服务暂时不可用，请稍后重试。",
      ...queryInterpretation,
    }, { status: 502 });
  }

  if (resolution.status === "not_found" || !candidates.length) {
    return Response.json({
      status: "not_found",
      error: "PubChem 中未找到匹配化合物，请核对已收录中文名、英文名、CAS、CID 或完整 InChIKey。",
      ...queryInterpretation,
    }, { status: 404 });
  }

  // A name or CAS number may denote a salt, parent, stereoisomer or mixture
  // even when PubChem currently returns only one CID. Require an explicit
  // structure confirmation for these semantic lookups. A unique CID or full
  // InChIKey is already an exact identity and can continue automatically.
  if (resolution.status === "ambiguous" || requiresStructureConfirmation(resolution.queryKind)) {
    return Response.json({
      status: "ambiguous",
      queryKind: resolution.queryKind,
      candidates,
      totalAvailable: resolution.source.totalAvailable ?? candidates.length,
      truncated: resolution.source.truncated,
      ...queryInterpretation,
    });
  }

  return Response.json({
    status: "resolved",
    queryKind: resolution.queryKind,
    compound: toSearchCandidate(resolution.selected ?? resolution.candidates[0]),
    ...queryInterpretation,
  });
}
