import type {
  FullTextStatus,
  PublicationRecord,
  SourceRequestOptions,
  SourceResult,
} from "../types";
import {
  clampInteger,
  fetchJson,
  makeSourceResult,
  normalizeDoi,
  normalizeTitle,
  stripMarkup,
  toSourceError,
  uniqueStrings,
} from "./common";

const EUROPE_PMC_API = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

interface RawEuropePmcAuthor {
  fullName?: string;
  firstName?: string;
  lastName?: string;
}

interface RawEuropePmcFullTextUrl {
  availability?: string;
  availabilityCode?: string;
  documentStyle?: string;
  site?: string;
  url?: string;
}

interface RawEuropePmcResult {
  id?: string;
  source?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  authorList?: { author?: RawEuropePmcAuthor[] };
  pubYear?: string;
  firstPublicationDate?: string;
  electronicPublicationDate?: string;
  journalTitle?: string;
  journalInfo?: { journal?: { title?: string } };
  abstractText?: string;
  pubTypeList?: { pubType?: string[] };
  keywordList?: { keyword?: string[] };
  meshHeadingList?: {
    meshHeading?: Array<{
      descriptorName?: string | { value?: string };
    }>;
  };
  citedByCount?: number;
  isOpenAccess?: string;
  fullTextUrlList?: { fullTextUrl?: RawEuropePmcFullTextUrl[] };
}

interface EuropePmcResponse {
  hitCount?: number;
  nextCursorMark?: string;
  resultList?: { result?: RawEuropePmcResult[] };
}

function buildEuropePmcQuery(terms: string[]): string {
  const safeTerms = uniqueStrings(terms)
    .map((term) => term.replace(/["\\]/g, " ").trim())
    .filter((term) => term.length >= 2)
    .slice(0, 6);
  if (safeTerms.length === 0) return "";
  return safeTerms.map((term) => `TITLE_ABS:"${term}"`).join(" OR ");
}

function fullTextFields(raw: RawEuropePmcResult): {
  status: FullTextStatus;
  url?: string;
} {
  const urls = raw.fullTextUrlList?.fullTextUrl ?? [];
  const openPdf = urls.find(
    (item) =>
      item.availabilityCode === "OA" &&
      item.documentStyle?.toLowerCase() === "pdf" &&
      item.url,
  );
  if (openPdf?.url) return { status: "open_pdf", url: openPdf.url };

  const openHtml = urls.find(
    (item) => item.availabilityCode === "OA" && item.url,
  );
  if (openHtml?.url) return { status: "html_not_pdf", url: openHtml.url };

  const subscription = urls.find(
    (item) => item.availabilityCode === "S" || /subscription/i.test(item.availability ?? ""),
  );
  if (subscription?.url) return { status: "needs_institution", url: subscription.url };
  if (raw.isOpenAccess === "N") return { status: "no_open_pdf" };
  return { status: "unknown" };
}

function mapPublication(raw: RawEuropePmcResult): PublicationRecord | undefined {
  const id = raw.id?.trim() || raw.pmid?.trim() || raw.pmcid?.trim();
  const title = stripMarkup(raw.title)?.trim();
  if (!id || !title) return undefined;
  const authors = uniqueStrings(
    raw.authorList?.author?.map((author) => {
      if (author.fullName) return author.fullName;
      return [author.firstName, author.lastName].filter(Boolean).join(" ");
    }) ?? raw.authorString?.split(/,\s*/) ?? [],
  );
  const fullText = fullTextFields(raw);
  const sourceDatabase = raw.source?.trim() || "MED";
  const publicationDate =
    raw.firstPublicationDate ?? raw.electronicPublicationDate ?? undefined;
  const parsedYear = Number(raw.pubYear ?? publicationDate?.slice(0, 4));
  const meshTerms = uniqueStrings(
    raw.meshHeadingList?.meshHeading?.map((heading) => {
      const descriptor = heading.descriptorName;
      return typeof descriptor === "string" ? descriptor : descriptor?.value;
    }) ?? [],
  );

  return {
    id,
    sourceDatabase,
    title,
    authors,
    authorString: raw.authorString,
    year: Number.isSafeInteger(parsedYear) ? parsedYear : undefined,
    publicationDate,
    publicationTypes: uniqueStrings(raw.pubTypeList?.pubType ?? []),
    journal: raw.journalInfo?.journal?.title ?? raw.journalTitle,
    doi: normalizeDoi(raw.doi),
    pmid: raw.pmid,
    pmcid: raw.pmcid,
    abstract: stripMarkup(raw.abstractText),
    keywords: uniqueStrings(raw.keywordList?.keyword ?? []),
    meshTerms,
    citedByCount: raw.citedByCount,
    isOpenAccess: raw.isOpenAccess === "Y",
    fullTextStatus: fullText.status,
    fullTextUrl: fullText.url,
    sourceUrl: `https://europepmc.org/article/${encodeURIComponent(sourceDatabase)}/${encodeURIComponent(id)}`,
  };
}

function publicationKey(record: PublicationRecord): string {
  if (record.doi) return `doi:${record.doi}`;
  if (record.pmid) return `pmid:${record.pmid}`;
  if (record.pmcid) return `pmcid:${record.pmcid.toUpperCase()}`;
  return `title:${normalizeTitle(record.title)}|${record.year ?? ""}`;
}

export async function searchEuropePmcPublications(
  terms: string[],
  options: SourceRequestOptions = {},
): Promise<SourceResult<PublicationRecord>> {
  const query = buildEuropePmcQuery(terms);
  if (!query) {
    return makeSourceResult({
      source: "europe_pmc",
      status: "error",
      errors: [
        {
          code: "empty_query",
          message: "Europe PMC search requires at least one non-empty compound name.",
          retryable: false,
        },
      ],
    });
  }

  const maxRecords = clampInteger(options.maxRecords, 50, 1, 1_000);
  const pageSize = Math.min(
    maxRecords,
    clampInteger(options.pageSize, 25, 1, 100),
  );
  const records: PublicationRecord[] = [];
  const seen = new Set<string>();
  const errors: ReturnType<typeof toSourceError>[] = [];
  let cursorMark = "*";
  let page = 1;
  let hitCount = 0;
  let nextCursor: string | undefined;

  while (records.length < maxRecords) {
    const requestSize = Math.min(pageSize, maxRecords - records.length);
    const params = new URLSearchParams({
      query,
      format: "json",
      resultType: "core",
      pageSize: String(requestSize),
      cursorMark,
      synonym: "false",
    });
    const url = `${EUROPE_PMC_API}?${params.toString()}`;

    try {
      const response = await fetchJson<EuropePmcResponse>(
        url,
        {},
        options.timeoutMs,
        options.fetchImpl,
      );
      hitCount = response.hitCount ?? hitCount;
      const pageRecords = (response.resultList?.result ?? [])
        .map(mapPublication)
        .filter((record): record is PublicationRecord => Boolean(record));
      for (const record of pageRecords) {
        const key = publicationKey(record);
        if (seen.has(key)) continue;
        seen.add(key);
        records.push(record);
        if (records.length >= maxRecords) break;
      }

      nextCursor = response.nextCursorMark;
      if (
        pageRecords.length === 0 ||
        !nextCursor ||
        nextCursor === cursorMark ||
        records.length >= hitCount
      ) {
        break;
      }
      cursorMark = nextCursor;
      page += 1;
    } catch (error) {
      errors.push(toSourceError(error, page));
      break;
    }
  }

  const truncated = hitCount > records.length;
  if (truncated && records.length >= maxRecords) {
    errors.push({
      code: "publication_limit_reached",
      message: `Europe PMC reports ${hitCount} matching records; ${records.length} were loaded.`,
      retryable: false,
    });
  }

  return makeSourceResult({
    source: "europe_pmc",
    records,
    errors,
    status: errors.length > 0 ? (records.length > 0 ? "partial" : "error") : "success",
    totalAvailable: hitCount,
    nextCursor: truncated ? nextCursor : undefined,
    truncated,
  });
}
