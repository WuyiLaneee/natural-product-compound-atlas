import type {
  CompoundCandidate,
  CompoundProfile,
  CompoundQueryKind,
  CompoundResolution,
  PubChemPatentReference,
  SourceRequestOptions,
  SourceResult,
} from "../types";
import {
  SourceFetchError,
  clampInteger,
  fetchJson,
  makeSourceResult,
  parseFiniteNumber,
  toSourceError,
  uniqueStrings,
} from "./common";

const PUBCHEM_PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PROPERTY_LIST = [
  "Title",
  "IUPACName",
  "MolecularFormula",
  "MolecularWeight",
  "Charge",
  "CovalentUnitCount",
  "DefinedAtomStereoCount",
  "UndefinedAtomStereoCount",
  "CanonicalSMILES",
  "IsomericSMILES",
  "InChI",
  "InChIKey",
].join(",");

// Compound resolution is the latency-sensitive step that runs before the user
// can confirm a structure. Large records (for example ginsenosides) can make
// PubChem's full IUPAC/InChI response exceed the browser search timeout even
// though the same CID is healthy. Load only the fields required to identify
// and safely distinguish the entity here; the profile request enriches the
// selected compound with the full property set afterwards.
const RESOLUTION_PROPERTY_LIST = [
  "Title",
  "MolecularFormula",
  "MolecularWeight",
  "Charge",
  "CovalentUnitCount",
  "DefinedAtomStereoCount",
  "UndefinedAtomStereoCount",
  "InChIKey",
].join(",");

const PUBCHEM_TRANSIENT_RETRY_DELAY_MS = 1_000;

async function fetchPubChemJson<T>(
  url: string,
  timeoutMs: number | undefined,
  fetchImpl: typeof fetch | undefined,
): Promise<T> {
  try {
    return await fetchJson<T>(url, {}, timeoutMs, fetchImpl);
  } catch (error) {
    const retryableTransient =
      error instanceof SourceFetchError && error.retryable;
    if (!retryableTransient) throw error;

    await new Promise((resolve) =>
      setTimeout(resolve, PUBCHEM_TRANSIENT_RETRY_DELAY_MS),
    );
    return fetchJson<T>(url, {}, timeoutMs, fetchImpl);
  }
}

export interface PubChemProfileOptions extends SourceRequestOptions {
  maxSynonyms?: number;
  maxPatentReferences?: number;
}

interface PubChemCidResponse {
  IdentifierList?: { CID?: number[] };
}

interface PubChemProperty {
  CID?: number;
  Title?: string;
  IUPACName?: string;
  MolecularFormula?: string;
  MolecularWeight?: number | string;
  Charge?: number | string;
  CovalentUnitCount?: number | string;
  DefinedAtomStereoCount?: number | string;
  UndefinedAtomStereoCount?: number | string;
  CanonicalSMILES?: string;
  IsomericSMILES?: string;
  ConnectivitySMILES?: string;
  SMILES?: string;
  InChI?: string;
  InChIKey?: string;
}

interface PubChemPropertyResponse {
  PropertyTable?: { Properties?: PubChemProperty[] };
}

interface PubChemInformationResponse {
  InformationList?: {
    Information?: Array<{
      CID?: number;
      Synonym?: string[];
      PatentID?: string[];
    }>;
  };
}

export type PubChemEntityIdentity = Pick<
  CompoundCandidate,
  | "covalentUnitCount"
  | "canonicalSmiles"
  | "isomericSmiles"
>;

function parseInteger(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

/**
 * Returns true when PubChem represents the selected CID as more than one
 * disconnected covalent component. The SMILES fallback keeps the check useful
 * for curated or cached records that predate CovalentUnitCount enrichment.
 */
export function isMultiComponentCompound(
  compound: PubChemEntityIdentity,
): boolean {
  if (
    compound.covalentUnitCount !== undefined &&
    compound.covalentUnitCount > 1
  ) {
    return true;
  }
  return [compound.isomericSmiles, compound.canonicalSmiles].some(
    (smiles) => smiles?.includes(".") === true,
  );
}

/**
 * Builds a display-ready entity note without guessing a specific chemical
 * class. A disconnected PubChem entity may be a salt, solvate, co-crystal or
 * another multi-component form, so the wording deliberately preserves that
 * distinction for downstream evidence retrieval.
 */
export function buildPubChemEntityNote(
  compound: PubChemEntityIdentity,
): string | undefined {
  if (!isMultiComponentCompound(compound)) return undefined;
  const count = compound.covalentUnitCount;
  const countText = count !== undefined && count > 1 ? `${count} 个` : "多个";
  return `该 PubChem 化学实体包含${countText}共价单元，可能属于盐、溶剂化物、共晶或其他多组分形式；检索与解读时应保留完整化学实体。`;
}

function detectQueryKind(query: string): CompoundQueryKind {
  if (/^\d+$/.test(query)) return "cid";
  if (/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i.test(query)) return "inchikey";
  return "name";
}

function propertyToCandidate(property: PubChemProperty): CompoundCandidate | undefined {
  const cid = Number(property.CID);
  if (!Number.isSafeInteger(cid) || cid <= 0) return undefined;
  return {
    cid,
    title: property.Title?.trim() || `PubChem CID ${cid}`,
    iupacName: property.IUPACName?.trim() || undefined,
    molecularFormula: property.MolecularFormula,
    molecularWeight: parseFiniteNumber(property.MolecularWeight),
    charge: parseInteger(property.Charge),
    covalentUnitCount: parseInteger(property.CovalentUnitCount),
    definedAtomStereoCount: parseInteger(property.DefinedAtomStereoCount),
    undefinedAtomStereoCount: parseInteger(property.UndefinedAtomStereoCount),
    canonicalSmiles: property.ConnectivitySMILES ?? property.CanonicalSMILES,
    isomericSmiles: property.SMILES ?? property.IsomericSMILES,
    inchi: property.InChI,
    inchiKey: property.InChIKey?.toUpperCase(),
    pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
  };
}

function notFoundResolution(
  query: string,
  queryKind: CompoundQueryKind,
): CompoundResolution {
  return {
    query,
    queryKind,
    status: "not_found",
    candidates: [],
    source: makeSourceResult({ source: "pubchem", records: [] }),
  };
}

export async function resolvePubChemCompound(
  rawQuery: string,
  options: SourceRequestOptions = {},
): Promise<CompoundResolution> {
  const query = rawQuery.trim();
  const queryKind = detectQueryKind(query);
  const timeoutMs = options.timeoutMs;
  const fetchImpl = options.fetchImpl;
  const maxCandidates = clampInteger(options.maxRecords, 10, 1, 100);

  if (!query || query.length > 500) {
    const source = makeSourceResult<CompoundCandidate>({
      source: "pubchem",
      status: "error",
      errors: [
        {
          code: "unsupported_query",
          message: "Compound query must contain between 1 and 500 characters.",
          retryable: false,
        },
      ],
    });
    return {
      query,
      queryKind,
      status: "unsupported",
      candidates: [],
      source,
    };
  }

  try {
    let cids: number[];
    if (queryKind === "cid") {
      const cid = Number(query);
      if (!Number.isSafeInteger(cid) || cid <= 0) return notFoundResolution(query, queryKind);
      cids = [cid];
    } else {
      const namespace = queryKind === "inchikey" ? "inchikey" : "name";
      const cidUrl = `${PUBCHEM_PUG}/compound/${namespace}/${encodeURIComponent(query)}/cids/JSON`;
      const cidResponse = await fetchPubChemJson<PubChemCidResponse>(
        cidUrl,
        timeoutMs,
        fetchImpl,
      );
      cids = Array.from(new Set(cidResponse.IdentifierList?.CID ?? [])).filter(
        (cid) => Number.isSafeInteger(cid) && cid > 0,
      );
    }

    if (cids.length === 0) return notFoundResolution(query, queryKind);

    const selectedCids = cids.slice(0, maxCandidates);
    const propertyUrl = `${PUBCHEM_PUG}/compound/cid/${selectedCids.join(",")}/property/${RESOLUTION_PROPERTY_LIST}/JSON`;
    const propertyResponse = await fetchPubChemJson<PubChemPropertyResponse>(
      propertyUrl,
      timeoutMs,
      fetchImpl,
    );
    const candidates = (propertyResponse.PropertyTable?.Properties ?? [])
      .map(propertyToCandidate)
      .filter((candidate): candidate is CompoundCandidate => Boolean(candidate));
    const truncated = cids.length > selectedCids.length;
    const errors = truncated
      ? [
          {
            code: "candidate_limit_reached",
            message: `PubChem returned ${cids.length} candidate structures; ${selectedCids.length} were loaded.`,
            retryable: false,
          },
        ]
      : [];
    const source = makeSourceResult({
      source: "pubchem",
      records: candidates,
      errors,
      status: truncated ? "partial" : "success",
      totalAvailable: cids.length,
      truncated,
    });

    if (candidates.length === 0) {
      return { query, queryKind, status: "not_found", candidates, source };
    }
    if (cids.length > 1 || candidates.length > 1) {
      return { query, queryKind, status: "ambiguous", candidates, source };
    }
    return {
      query,
      queryKind,
      status: "resolved",
      candidates,
      selected: candidates[0],
      source,
    };
  } catch (error) {
    if (error instanceof SourceFetchError && error.httpStatus === 404) {
      return notFoundResolution(query, queryKind);
    }
    return {
      query,
      queryKind,
      status: "not_found",
      candidates: [],
      source: makeSourceResult({
        source: "pubchem",
        status: "error",
        errors: [toSourceError(error)],
      }),
    };
  }
}

export async function fetchPubChemProfile(
  compound: CompoundCandidate | number,
  options: PubChemProfileOptions = {},
): Promise<SourceResult<CompoundProfile>> {
  const timeoutMs = options.timeoutMs;
  const fetchImpl = options.fetchImpl;
  const maxSynonyms = clampInteger(options.maxSynonyms, 200, 1, 1_000);
  const maxPatentReferences = clampInteger(
    options.maxPatentReferences ?? options.maxRecords,
    100,
    0,
    2_000,
  );
  const cid = typeof compound === "number" ? compound : compound.cid;
  let propertyError: ReturnType<typeof toSourceError> | undefined;

  try {
    let candidate: CompoundCandidate;
    if (typeof compound === "number") {
      const propertyUrl = `${PUBCHEM_PUG}/compound/cid/${cid}/property/${PROPERTY_LIST}/JSON`;
      const propertyResponse = await fetchJson<PubChemPropertyResponse>(
        propertyUrl,
        {},
        timeoutMs,
        fetchImpl,
      );
      const loaded = (propertyResponse.PropertyTable?.Properties ?? [])
        .map(propertyToCandidate)
        .find(Boolean);
      if (!loaded) {
        return makeSourceResult({
          source: "pubchem",
          status: "error",
          errors: [
            {
              code: "compound_not_found",
              message: `PubChem CID ${cid} did not return a compound record.`,
              retryable: false,
            },
          ],
        });
      }
      candidate = loaded;
    } else {
      candidate = compound;
      try {
        const propertyUrl = `${PUBCHEM_PUG}/compound/cid/${cid}/property/${PROPERTY_LIST}/JSON`;
        const propertyResponse = await fetchJson<PubChemPropertyResponse>(
          propertyUrl,
          {},
          timeoutMs,
          fetchImpl,
        );
        const loaded = (propertyResponse.PropertyTable?.Properties ?? [])
          .map(propertyToCandidate)
          .find(Boolean);
        if (loaded) candidate = { ...compound, ...loaded };
      } catch (error) {
        // A caller-supplied, curated identity remains usable when the optional
        // property enrichment request fails. Preserve that profile and expose
        // the degradation in the source status instead of losing all results.
        propertyError = toSourceError(error);
      }
    }

    const synonymsUrl = `${PUBCHEM_PUG}/compound/cid/${cid}/synonyms/JSON`;
    const patentsUrl = `${PUBCHEM_PUG}/compound/cid/${cid}/xrefs/PatentID/JSON`;
    const [synonymOutcome, patentOutcome] = await Promise.allSettled([
      fetchJson<PubChemInformationResponse>(synonymsUrl, {}, timeoutMs, fetchImpl),
      fetchJson<PubChemInformationResponse>(patentsUrl, {}, timeoutMs, fetchImpl),
    ]);

    const errors = propertyError ? [propertyError] : [];
    let allSynonyms: string[] = [];
    let allPatentIds: string[] = [];

    if (synonymOutcome.status === "fulfilled") {
      allSynonyms = uniqueStrings(
        synonymOutcome.value.InformationList?.Information?.flatMap(
          (item) => item.Synonym ?? [],
        ) ?? [],
      );
    } else if (
      !(synonymOutcome.reason instanceof SourceFetchError &&
        synonymOutcome.reason.httpStatus === 404)
    ) {
      errors.push(toSourceError(synonymOutcome.reason));
    }

    if (patentOutcome.status === "fulfilled") {
      allPatentIds = uniqueStrings(
        patentOutcome.value.InformationList?.Information?.flatMap(
          (item) => item.PatentID ?? [],
        ) ?? [],
      );
    } else if (
      !(patentOutcome.reason instanceof SourceFetchError &&
        patentOutcome.reason.httpStatus === 404)
    ) {
      errors.push(toSourceError(patentOutcome.reason));
    }

    const synonyms = allSynonyms.slice(0, maxSynonyms);
    const selectedPatentIds = allPatentIds.slice(0, maxPatentReferences);
    const patentReferences: PubChemPatentReference[] = selectedPatentIds.map(
      (publicationNumber) => ({
        publicationNumber,
        relationship: "mention",
        relationshipBasis: "pubchem_xref",
        sourceUrl: `${candidate.pubchemUrl}#section=Patents`,
      }),
    );
    const synonymsTruncated = allSynonyms.length > synonyms.length;
    const patentsTruncated = allPatentIds.length > selectedPatentIds.length;

    if (synonymsTruncated) {
      errors.push({
        code: "synonym_limit_reached",
        message: `PubChem returned ${allSynonyms.length} synonyms; ${synonyms.length} were retained.`,
        retryable: false,
      });
    }
    if (patentsTruncated) {
      errors.push({
        code: "patent_limit_reached",
        message: `PubChem returned ${allPatentIds.length} patent cross-references; ${selectedPatentIds.length} were retained.`,
        retryable: false,
      });
    }

    const profile: CompoundProfile = {
      ...candidate,
      synonyms,
      patentReferences,
      patentReferenceCount: allPatentIds.length,
    };
    const truncated = synonymsTruncated || patentsTruncated;
    return makeSourceResult({
      source: "pubchem",
      records: [profile],
      errors,
      status: errors.length > 0 || truncated ? "partial" : "success",
      totalAvailable: 1,
      truncated,
    });
  } catch (error) {
    return makeSourceResult({
      source: "pubchem",
      status: "error",
      errors: [toSourceError(error)],
    });
  }
}
