import type { CompoundCandidate, CompoundQueryKind } from "./types";
import { buildPubChemEntityNote } from "./sources/pubchem";

/**
 * API/cache policy shared by the dynamic PubChem search and CID evidence route.
 * These names deliberately differ from the original ginsenoside-only service
 * so a cloned deployment can never reuse an incompatible cached payload.
 */
export const COMPOUND_SEARCH_RATE_BUCKET = "pubchem-compound-search";
export const COMPOUND_REFRESH_RATE_BUCKET = "pubchem-compound-evidence-refresh";
export const COMPOUND_EVIDENCE_CACHE_SOURCE = "pubchem_compound_evidence_aggregate";
export const COMPOUND_EVIDENCE_CACHE_VERSION = "v1-any-pubchem-cid";
export const COMPOUND_EVIDENCE_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;

export function parsePubChemCid(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const cid = Number(raw);
  return Number.isSafeInteger(cid) && cid > 0 ? cid : null;
}

export function compoundEvidenceCacheId(cid: number): string {
  return `${COMPOUND_EVIDENCE_CACHE_VERSION}:cid:${cid}`;
}

export function requiresStructureConfirmation(queryKind: CompoundQueryKind): boolean {
  return queryKind === "name";
}

export function toSearchCandidate(candidate: CompoundCandidate) {
  return {
    ...candidate,
    entityNote: buildPubChemEntityNote(candidate),
    structureUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${candidate.cid}/PNG?record_type=2d`,
  };
}
