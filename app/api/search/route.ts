import { isDatabaseUnavailableError } from "@/db";
import { findCatalogMatches } from "@/lib/catalog";
import { consumeRateLimit } from "@/lib/storage";

function clientIp(request: Request): string {
  const headers = request.headers;
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

function toCandidate(entry: ReturnType<typeof findCatalogMatches>[number]) {
  const cid = entry.pubchemCid;
  if (!cid) return null;
  return {
    cid,
    title: entry.displayNameEn,
    displayNameZh: entry.displayNameZh,
    inchiKey: entry.pubchemInchiKey ?? undefined,
    structureUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?record_type=2d`,
    verification: entry.pubchemVerification,
    note: entry.pubchemNote,
  };
}

async function enforceRateLimit(request: Request) {
  try {
    const decision = await consumeRateLimit({
      bucketKey: "compound-search",
      ipAddress: clientIp(request),
      salt: process.env.RATE_LIMIT_SALT || "local-ginsenoside-development",
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
  if (!query || query.length > 160) return Response.json({ error: "请输入 1–160 个字符的人参皂苷名称、CAS、CID 或 InChIKey" }, { status: 400 });

  const rate = await enforceRateLimit(request);
  if (rate && !rate.allowed) {
    return Response.json(
      { error: "检索频率过高，请稍后再试", resetAt: new Date(rate.resetAt).toISOString() },
      { status: 429, headers: { "retry-after": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } },
    );
  }

  const matches = findCatalogMatches(query, 12);
  const candidates = matches.map(toCandidate).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!candidates.length) {
    return Response.json({
      status: "unsupported",
      error: "首版仅检索已核验的人参皂苷单体。未找到目录匹配，请尝试完整名称、CAS 或 PubChem CID。",
      catalogOnly: true,
    }, { status: 404 });
  }

  const requiresConfirmation = matches.length > 1 || matches.some((entry) => entry.requiresStereoisomerDisambiguation || entry.pubchemVerification !== "verified-full-stereochemistry");
  if (requiresConfirmation) return Response.json({ status: "ambiguous", candidates });
  return Response.json({ status: "resolved", compound: candidates[0] });
}
