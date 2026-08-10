import type {
  EpoOpsCredentials,
  PatentRecord,
  PatentRelationship,
  SourceRequestOptions,
  SourceResult,
} from "../types";
import {
  SourceFetchError,
  clampInteger,
  decodeXmlEntities,
  encodeBasicCredentials,
  fetchJson,
  fetchText,
  makeSourceResult,
  normalizeWhitespace,
  skippedSourceResult,
  toSourceError,
  uniqueStrings,
} from "./common";

const EPO_AUTH_URL = "https://ops.epo.org/3.2/auth/accesstoken";
const EPO_API = "https://ops.epo.org/3.2/rest-services";

export interface EpoOpsSearchOptions extends SourceRequestOptions {
  aliases?: string[];
  publicationNumbers?: string[];
  maxFullTextRecords?: number;
}

interface EpoTokenResponse {
  access_token?: string;
  expires_in?: string | number;
}

interface ParsedExchangeDocument {
  record: PatentRecord;
  epodocNumber: string;
}

function stripXml(value: string): string {
  return decodeXmlEntities(normalizeWhitespace(value.replace(/<[^>]*>/g, " ")));
}

function readAttribute(attributes: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = attributes.match(new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1];
}

function elementText(xml: string, element: string, preferredLanguage?: string): string | undefined {
  const escaped = element.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(
    `<(?:[\\w-]+:)?${escaped}\\b([^>]*)>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${escaped}>`,
    "gi",
  );
  let fallback: string | undefined;
  for (const match of xml.matchAll(expression)) {
    const text = stripXml(match[2]);
    if (!text) continue;
    if (!fallback) fallback = text;
    if (!preferredLanguage) return text;
    const language = readAttribute(match[1], "lang");
    if (language?.toLowerCase() === preferredLanguage.toLowerCase()) return text;
  }
  return fallback;
}

function nestedNames(xml: string, container: string): string[] {
  const escaped = container.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const containers = Array.from(
    xml.matchAll(
      new RegExp(
        `<(?:[\\w-]+:)?${escaped}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${escaped}>`,
        "gi",
      ),
    ),
  );
  return uniqueStrings(
    containers.flatMap((match) =>
      Array.from(
        match[1].matchAll(
          /<(?:[\w-]+:)?name\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?name>/gi,
        ),
      ).map((nameMatch) => stripXml(nameMatch[1])),
    ),
  );
}

function normalizePatentNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseExchangeDocuments(xml: string): ParsedExchangeDocument[] {
  const output: ParsedExchangeDocument[] = [];
  const expression =
    /<(?:[\w-]+:)?exchange-document\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?exchange-document>/gi;

  for (const match of xml.matchAll(expression)) {
    const attributes = match[1];
    const body = match[2];
    const country = readAttribute(attributes, "country")?.toUpperCase();
    const documentNumber = readAttribute(attributes, "doc-number");
    const kind = readAttribute(attributes, "kind")?.toUpperCase();
    const familyId = readAttribute(attributes, "family-id");
    if (!country || !documentNumber) continue;
    const publicationNumber = `${country}${documentNumber}${kind ?? ""}`;
    const publicationReference = body.match(
      /<(?:[\w-]+:)?publication-reference\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?publication-reference>/i,
    )?.[1];
    const publicationDate = publicationReference
      ? elementText(publicationReference, "date")
      : undefined;
    const abstract = elementText(body, "abstract", "en");
    const title = elementText(body, "invention-title", "en");

    output.push({
      epodocNumber: `${country}${documentNumber}`,
      record: {
        publicationNumber,
        country,
        documentNumber,
        kind,
        familyId,
        familyMembers: [],
        title,
        abstract,
        publicationDate,
        applicants: nestedNames(body, "applicants"),
        inventors: nestedNames(body, "inventors"),
        relationship: "mention",
        relationshipBasis: "epo_title_or_abstract",
        evidenceLocator: abstract ? "abstract" : title ? "title" : undefined,
        evidenceExcerpt: abstract ?? title,
        claimsAvailable: false,
        descriptionAvailable: false,
        sourceUrl: `https://worldwide.espacenet.com/patent/search?q=pn%3D${encodeURIComponent(publicationNumber)}`,
      },
    });
  }
  return output;
}

function buildCql(terms: string[]): string {
  const safe = uniqueStrings(terms)
    .map((term) => term.replace(/["\\]/g, " ").trim())
    .filter((term) => term.length >= 2)
    .slice(0, 4);
  return safe.map((term) => `ta="${term}"`).join(" or ");
}

function toDocdbNumber(value: string): string | undefined {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^([A-Z]{2})-?(\d+)-?([A-Z]\d?)$/);
  if (!match) return undefined;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function extractTotalCount(xml: string): number | undefined {
  const match = xml.match(/<(?:[\w-]+:)?biblio-search\b[^>]*total-result-count=["'](\d+)["']/i);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function normalizedSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function findEvidenceExcerpt(
  text: string,
  aliases: string[],
): { excerpt: string; alias: string; index: number } | undefined {
  const normalized = normalizedSearchText(text);
  for (const alias of aliases) {
    const normalizedAlias = normalizedSearchText(alias);
    if (!normalizedAlias) continue;
    const normalizedIndex = normalized.indexOf(normalizedAlias);
    if (normalizedIndex < 0) continue;

    // Use the raw text for a human-readable excerpt. A direct raw match is ideal;
    // otherwise fall back to a bounded prefix from the normalized match position.
    const rawIndex = text.toLocaleLowerCase().indexOf(alias.toLocaleLowerCase());
    const index = rawIndex >= 0 ? rawIndex : Math.min(normalizedIndex, text.length - 1);
    const start = Math.max(0, index - 220);
    const end = Math.min(text.length, index + alias.length + 320);
    return {
      excerpt: normalizeWhitespace(text.slice(start, end)),
      alias,
      index,
    };
  }
  return undefined;
}

function classifyDescription(
  description: string,
  aliases: string[],
): {
  relationship: PatentRelationship;
  basis: "epo_description" | "epo_worked_example";
  locator: string;
  excerpt: string;
} | undefined {
  const evidence = findEvidenceExcerpt(description, aliases);
  if (!evidence) return undefined;
  const context = description.slice(Math.max(0, evidence.index - 500), evidence.index + 500);
  const isExample = /\b(?:example|examples|experimental example|preparation example)\b|实施例|实验例/i.test(
    context,
  );
  return {
    relationship: isExample ? "example" : "mention",
    basis: isExample ? "epo_worked_example" : "epo_description",
    locator: isExample ? "worked example" : "description",
    excerpt: evidence.excerpt,
  };
}

async function requestAccessToken(
  credentials: EpoOpsCredentials,
  options: EpoOpsSearchOptions,
): Promise<string> {
  const response = await fetchJson<EpoTokenResponse>(
    EPO_AUTH_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodeBasicCredentials(credentials.clientId, credentials.clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    },
    options.timeoutMs,
    options.fetchImpl,
  );
  if (!response.access_token) {
    throw new SourceFetchError("EPO OPS token response did not include an access token.", {
      code: "invalid_token_response",
      retryable: false,
    });
  }
  return response.access_token;
}

async function enrichFullText(
  document: ParsedExchangeDocument,
  aliases: string[],
  token: string,
  options: EpoOpsSearchOptions,
): Promise<{ record: PatentRecord; errors: ReturnType<typeof toSourceError>[]; quotaHit: boolean }> {
  const errors: ReturnType<typeof toSourceError>[] = [];
  const record = { ...document.record };
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/fulltext+xml",
  };
  let claims: string | undefined;
  let description: string | undefined;
  let quotaHit = false;

  try {
    const claimsXml = await fetchText(
      `${EPO_API}/published-data/publication/epodoc/${encodeURIComponent(document.epodocNumber)}/claims`,
      { headers },
      options.timeoutMs,
      options.fetchImpl,
    );
    claims = stripXml(claimsXml);
    record.claimsAvailable = Boolean(claims);
  } catch (error) {
    if (!(error instanceof SourceFetchError && error.httpStatus === 404)) {
      errors.push(toSourceError(error));
      quotaHit = error instanceof SourceFetchError && (error.httpStatus === 403 || error.httpStatus === 429);
    }
  }

  if (!quotaHit) {
    try {
      const descriptionXml = await fetchText(
        `${EPO_API}/published-data/publication/epodoc/${encodeURIComponent(document.epodocNumber)}/description`,
        { headers },
        options.timeoutMs,
        options.fetchImpl,
      );
      description = stripXml(descriptionXml);
      record.descriptionAvailable = Boolean(description);
    } catch (error) {
      if (!(error instanceof SourceFetchError && error.httpStatus === 404)) {
        errors.push(toSourceError(error));
        quotaHit = error instanceof SourceFetchError && (error.httpStatus === 403 || error.httpStatus === 429);
      }
    }
  }

  const claimEvidence = claims ? findEvidenceExcerpt(claims, aliases) : undefined;
  if (claimEvidence) {
    record.relationship = "claim";
    record.relationshipBasis = "epo_claims";
    record.evidenceLocator = "claims";
    record.evidenceExcerpt = claimEvidence.excerpt;
    return { record, errors, quotaHit };
  }

  const descriptionEvidence = description
    ? classifyDescription(description, aliases)
    : undefined;
  if (descriptionEvidence) {
    record.relationship = descriptionEvidence.relationship;
    record.relationshipBasis = descriptionEvidence.basis;
    record.evidenceLocator = descriptionEvidence.locator;
    record.evidenceExcerpt = descriptionEvidence.excerpt;
  }
  return { record, errors, quotaHit };
}

function addOrMerge(
  documents: Map<string, ParsedExchangeDocument>,
  incoming: ParsedExchangeDocument[],
): void {
  for (const item of incoming) {
    const key = normalizePatentNumber(item.record.publicationNumber);
    const existing = documents.get(key);
    if (!existing) {
      documents.set(key, item);
      continue;
    }
    existing.record = {
      ...existing.record,
      ...item.record,
      title: existing.record.title ?? item.record.title,
      abstract: existing.record.abstract ?? item.record.abstract,
      familyId: existing.record.familyId ?? item.record.familyId,
      applicants: uniqueStrings([...existing.record.applicants, ...item.record.applicants]),
      inventors: uniqueStrings([...existing.record.inventors, ...item.record.inventors]),
    };
  }
}

function populateFamilyMembers(records: PatentRecord[]): PatentRecord[] {
  const families = new Map<string, string[]>();
  for (const record of records) {
    if (!record.familyId) continue;
    const members = families.get(record.familyId) ?? [];
    members.push(record.publicationNumber);
    families.set(record.familyId, members);
  }
  return records.map((record) => ({
    ...record,
    familyMembers: record.familyId
      ? uniqueStrings(families.get(record.familyId) ?? [record.publicationNumber])
      : [record.publicationNumber],
  }));
}

export async function searchEpoOpsPatents(
  query: string,
  credentials: EpoOpsCredentials | undefined,
  options: EpoOpsSearchOptions = {},
): Promise<SourceResult<PatentRecord>> {
  if (!credentials?.clientId?.trim() || !credentials.clientSecret?.trim()) {
    return skippedSourceResult(
      "epo_ops",
      "missing_credentials",
      "EPO OPS client credentials were not configured.",
    );
  }

  const aliases = uniqueStrings([query, ...(options.aliases ?? [])])
    .filter((alias) => alias.length >= 2)
    .slice(0, 8);
  const cql = buildCql(aliases);
  if (!cql) {
    return makeSourceResult({
      source: "epo_ops",
      status: "error",
      errors: [
        {
          code: "empty_query",
          message: "EPO OPS search requires at least one compound name.",
          retryable: false,
        },
      ],
    });
  }

  const maxRecords = clampInteger(options.maxRecords, 25, 1, 100);
  const pageSize = Math.min(
    maxRecords,
    clampInteger(options.pageSize, 25, 1, 100),
  );
  const maxFullTextRecords = clampInteger(options.maxFullTextRecords, 5, 0, 20);
  const errors: ReturnType<typeof toSourceError>[] = [];
  const documents = new Map<string, ParsedExchangeDocument>();
  let totalAvailable = 0;
  let nextCursor: string | undefined;

  try {
    const token = await requestAccessToken(credentials, options);
    let begin = 1;
    let page = 1;

    while (documents.size < maxRecords) {
      const end = Math.min(begin + pageSize - 1, begin + maxRecords - documents.size - 1);
      const params = new URLSearchParams({ q: cql });
      const url = `${EPO_API}/published-data/search/biblio?${params.toString()}`;
      try {
        const xml = await fetchText(
          url,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/exchange+xml",
              "X-OPS-Range": `${begin}-${end}`,
            },
          },
          options.timeoutMs,
          options.fetchImpl,
        );
        totalAvailable = extractTotalCount(xml) ?? totalAvailable;
        const pageDocuments = parseExchangeDocuments(xml);
        addOrMerge(documents, pageDocuments);
        if (pageDocuments.length === 0 || end >= totalAvailable || documents.size >= maxRecords) {
          nextCursor = end < totalAvailable ? String(end + 1) : undefined;
          break;
        }
        begin = end + 1;
        page += 1;
      } catch (error) {
        errors.push(toSourceError(error, page));
        break;
      }
    }

    const remaining = maxRecords - documents.size;
    const seedDocdbNumbers = uniqueStrings(options.publicationNumbers ?? [])
      .map(toDocdbNumber)
      .filter((value): value is string => Boolean(value))
      .slice(0, remaining);
    if (seedDocdbNumbers.length > 0) {
      try {
        const seedXml = await fetchText(
          `${EPO_API}/published-data/publication/docdb/biblio`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/exchange+xml",
              "Content-Type": "text/plain;charset=UTF-8",
            },
            body: seedDocdbNumbers.join("\n"),
          },
          options.timeoutMs,
          options.fetchImpl,
        );
        addOrMerge(documents, parseExchangeDocuments(seedXml));
      } catch (error) {
        errors.push(toSourceError(error));
      }
    }

    const enrichable = Array.from(documents.values()).slice(0, maxFullTextRecords);
    for (const document of enrichable) {
      const enriched = await enrichFullText(document, aliases, token, options);
      errors.push(...enriched.errors);
      documents.set(normalizePatentNumber(document.record.publicationNumber), {
        ...document,
        record: enriched.record,
      });
      if (enriched.quotaHit) break;
    }

    let records = populateFamilyMembers(
      Array.from(documents.values()).map((document) => document.record),
    );
    if (records.length > maxRecords) records = records.slice(0, maxRecords);
    totalAvailable = Math.max(totalAvailable, records.length);
    const truncated = totalAvailable > records.length;
    if (truncated) {
      errors.push({
        code: "patent_limit_reached",
        message: `EPO OPS reports ${totalAvailable} matching publications; ${records.length} were loaded.`,
        retryable: false,
      });
    }

    return makeSourceResult({
      source: "epo_ops",
      records,
      errors,
      status: errors.length > 0 ? (records.length > 0 ? "partial" : "error") : "success",
      totalAvailable,
      nextCursor,
      truncated,
    });
  } catch (error) {
    return makeSourceResult({
      source: "epo_ops",
      status: "error",
      errors: [toSourceError(error)],
    });
  }
}
