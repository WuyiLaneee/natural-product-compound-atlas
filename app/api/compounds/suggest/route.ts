import { findCatalogMatches, GINSENOSIDE_CATEGORIES } from "@/lib/catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ suggestions: [] });

  const suggestions = findCatalogMatches(query, 10).map((entry) => ({
    slug: entry.slug,
    cid: entry.pubchemCid,
    labelZh: entry.displayNameZh,
    labelEn: entry.displayNameEn,
    category: GINSENOSIDE_CATEGORIES[entry.category],
    needsDisambiguation: entry.requiresStereoisomerDisambiguation,
  }));
  return Response.json({ suggestions });
}
