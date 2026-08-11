import type { CompoundProfile } from "./types";

const INCHIKEY = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i;
const CAS_NUMBER = /^\d{2,7}-\d{2}-\d$/;
const DATABASE_IDENTIFIER = /^(?:CID|PUBCHEM|CHEMBL|CHEBI|UNII|DTXSID|DTXCID|NSC|EINECS|KEGG|HMDB|ZINC)[\s:_-]*[A-Z0-9-]+$/i;
const URL_OR_INCHI = /^(?:https?:\/\/|www\.|InChI=)/i;
const MOLECULAR_FORMULA = /^(?:[A-Z][a-z]?\d*){2,}$/;
const GENERIC_SINGLE_WORD = /^(?:compound|chemical|drug|metabolite|extract|mixture|oil|acid|base|salt)$/i;

function normalizeAlias(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function uniqueAliases(values: string[]): string[] {
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const value of values) {
    const normalized = normalizeAlias(value);
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    aliases.push(normalized);
  }
  return aliases;
}

function isUsefulScientificName(term: string): boolean {
  if (term.length < 2 || term.length > 100) return false;
  if (!/\p{L}/u.test(term)) return false;
  if (CAS_NUMBER.test(term) || INCHIKEY.test(term)) return false;
  if (DATABASE_IDENTIFIER.test(term) || URL_OR_INCHI.test(term)) return false;
  if (/^\d+(?:[-./]\d+)*$/.test(term) || MOLECULAR_FORMULA.test(term)) return false;
  if (GENERIC_SINGLE_WORD.test(term)) return false;
  // Very short single-token names (ATP, ACE, CAT, NO, etc.) create broad,
  // non-compound-specific hits regardless of casing. PubChem's expanded
  // synonym, when available, is used instead.
  const letterCount = Array.from(term.matchAll(/\p{L}/gu)).length;
  if (!/\s/u.test(term) && letterCount <= 4) return false;
  return true;
}

/**
 * Selects names suitable for quoted literature/trial searches. Registry IDs,
 * formulas and very long systematic labels remain visible in PubChem data but
 * are intentionally excluded from evidence retrieval to reduce false hits.
 */
export function selectScientificAliases(
  profile: CompoundProfile,
): string[] {
  const candidates = uniqueAliases([profile.title, ...profile.synonyms]);

  return candidates
    .filter(isUsefulScientificName)
    .slice(0, 6);
}

/**
 * Preserve the original 20(S)/20(R) guard for ginsenosides while allowing all
 * other PubChem-resolved compounds to use the general alias selection above.
 */
export function selectPublicationEffectAliases(
  profile: CompoundProfile,
  aliases: string[],
): string[] {
  const identityTitle = profile.title;
  const stereoMatch = identityTitle.match(/20\s*\(\s*([SR])\s*\)/iu);
  if (!stereoMatch) return aliases;

  const configuration = stereoMatch[1].toLocaleUpperCase();
  const stereoAliases = aliases.filter((alias) => {
    const compact = alias.normalize("NFKC").replace(/\s+/gu, "").toLocaleUpperCase();
    return (
      compact.includes(`20(${configuration})`) ||
      compact.includes(`20${configuration}-`) ||
      compact.startsWith(`${configuration}-GINSENOSIDE`)
    );
  });

  return stereoAliases.length > 0 ? stereoAliases : [identityTitle];
}
