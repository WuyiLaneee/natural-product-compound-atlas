import type {
  AggregateCompoundEvidenceInput,
  ChEMBLActivity,
  ChEMBLMeta,
  ChEMBLTarget,
  ClinicalTrialRecord,
  CompoundCandidate,
  CompoundProfile,
  CompoundResolution,
  EvidenceAggregation,
  EvidenceClaim,
  EvidenceExtractionDocument,
  EvidenceLevel,
  PatentRecord,
  PatentRelationship,
  PublicationRecord,
  SourceResult,
} from "./types";
import { fetchChEMBLActivities } from "./sources/chembl";
import { extractPublicationEffectClaims } from "./publication-effects";
import { searchClinicalTrials } from "./sources/clinical-trials";
import {
  makeSourceResult,
  normalizeDoi,
  normalizeTitle,
  normalizeWhitespace,
  skippedSourceResult,
  uniqueStrings,
} from "./sources/common";
import { searchEpoOpsPatents } from "./sources/epo-ops";
import { searchEuropePmcPublications } from "./sources/europe-pmc";
import { extractEvidenceClaims } from "./sources/openai";
import { fetchPubChemProfile, resolvePubChemCompound } from "./sources/pubchem";

const DEFAULT_LIMITS = {
  pubchemPatents: 100,
  chemblActivities: 100,
  publications: 50,
  trials: 25,
  patents: 50,
  patentFullText: 5,
  modelDocuments: 50,
} as const;

function publicationKey(record: PublicationRecord): string {
  const doi = normalizeDoi(record.doi);
  if (doi) return `doi:${doi}`;
  if (record.pmid) return `pmid:${record.pmid}`;
  if (record.pmcid) return `pmcid:${record.pmcid.toUpperCase()}`;
  return `title:${normalizeTitle(record.title)}|${record.year ?? ""}|${record.authors[0] ?? ""}`;
}

function publicationCompleteness(record: PublicationRecord): number {
  return [
    record.abstract,
    record.doi,
    record.pmid,
    record.pmcid,
    record.publicationDate,
    record.fullTextUrl,
  ].filter(Boolean).length;
}

export function dedupePublications(records: PublicationRecord[]): PublicationRecord[] {
  const byKey = new Map<string, PublicationRecord>();
  for (const record of records) {
    const key = publicationKey(record);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      continue;
    }
    const preferred =
      publicationCompleteness(record) > publicationCompleteness(existing)
        ? record
        : existing;
    const secondary = preferred === record ? existing : record;
    byKey.set(key, {
      ...secondary,
      ...preferred,
      authors: uniqueStrings([...preferred.authors, ...secondary.authors]),
      publicationTypes: uniqueStrings([
        ...preferred.publicationTypes,
        ...secondary.publicationTypes,
      ]),
      keywords: uniqueStrings([...preferred.keywords, ...secondary.keywords]),
      meshTerms: uniqueStrings([...preferred.meshTerms, ...secondary.meshTerms]),
    });
  }
  return Array.from(byKey.values());
}

function normalizePatentNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function patentRelationRank(value: PatentRelationship): number {
  return value === "claim" ? 3 : value === "example" ? 2 : 1;
}

function mergePatentRecords(left: PatentRecord, right: PatentRecord): PatentRecord {
  const stronger =
    patentRelationRank(right.relationship) > patentRelationRank(left.relationship)
      ? right
      : left;
  const weaker = stronger === right ? left : right;
  return {
    ...weaker,
    ...stronger,
    familyId: stronger.familyId ?? weaker.familyId,
    title: stronger.title ?? weaker.title,
    abstract: stronger.abstract ?? weaker.abstract,
    publicationDate: stronger.publicationDate ?? weaker.publicationDate,
    applicants: uniqueStrings([...stronger.applicants, ...weaker.applicants]),
    inventors: uniqueStrings([...stronger.inventors, ...weaker.inventors]),
    familyMembers: uniqueStrings([
      ...stronger.familyMembers,
      ...weaker.familyMembers,
      stronger.publicationNumber,
      weaker.publicationNumber,
    ]),
    claimsAvailable: stronger.claimsAvailable || weaker.claimsAvailable,
    descriptionAvailable:
      stronger.descriptionAvailable || weaker.descriptionAvailable,
  };
}

export function dedupePatentsByFamily(records: PatentRecord[]): PatentRecord[] {
  const exact = new Map<string, PatentRecord>();
  for (const record of records) {
    const key = normalizePatentNumber(record.publicationNumber);
    const existing = exact.get(key);
    exact.set(key, existing ? mergePatentRecords(existing, record) : record);
  }

  const families = new Map<string, PatentRecord>();
  const withoutFamily: PatentRecord[] = [];
  for (const record of exact.values()) {
    if (!record.familyId) {
      withoutFamily.push({
        ...record,
        familyMembers: uniqueStrings([
          ...record.familyMembers,
          record.publicationNumber,
        ]),
      });
      continue;
    }
    const existing = families.get(record.familyId);
    families.set(
      record.familyId,
      existing ? mergePatentRecords(existing, record) : record,
    );
  }

  return [...families.values(), ...withoutFamily];
}

export function dedupeEvidenceClaims(records: EvidenceClaim[]): EvidenceClaim[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = [
      record.source.source,
      record.source.sourceId,
      record.claimType,
      normalizeTitle(record.summary),
      normalizeTitle(record.effect ?? ""),
      normalizeTitle(record.target ?? ""),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function inferEvidenceLevel(text: string): EvidenceLevel | undefined {
  const normalized = text.toLocaleLowerCase();
  if (
    /surface plasmon resonance|\bspr\b|isothermal titration calorimetry|\bitc\b|microscale thermophoresis|\bmst\b|radioligand binding|dissociation constant|\bkd\b/.test(
      normalized,
    )
  ) {
    return "T1";
  }
  if (
    /knockdown|knockout|crispr|small interfering rna|\bsirna\b|shrna|overexpress|over-expression|rescue experiment/.test(
      normalized,
    )
  ) {
    return "T3";
  }
  const computational =
    /molecular docking|network pharmacology|in silico|machine learning|virtual screening/.test(
      normalized,
    );
  const experimental =
    /assay|cells?|mice|mouse|rats?|human|patients?|subjects?|binding|enzyme/.test(
      normalized,
    );
  if (computational && !experimental) return "T5";
  if (/mice|mouse|rats?|rabbit|zebrafish|human|patients?|subjects?|clinical trial/.test(normalized)) {
    return "T4";
  }
  if (/biochemical|enzyme|receptor|single protein|functional assay|cell-based/.test(normalized)) {
    return "T2";
  }
  return computational ? "T5" : undefined;
}

export function classifyPatentRelationship(
  claimsText: string | undefined,
  descriptionText: string | undefined,
  aliases: string[],
): PatentRelationship {
  const normalizedAliases = aliases.map(normalizeTitle).filter(Boolean);
  const containsAlias = (text: string | undefined): boolean => {
    if (!text) return false;
    const normalized = normalizeTitle(text);
    return normalizedAliases.some((alias) => normalized.includes(alias));
  };
  if (containsAlias(claimsText)) return "claim";
  if (containsAlias(descriptionText)) {
    const normalized = descriptionText?.toLocaleLowerCase() ?? "";
    if (/\b(?:example|experimental example|preparation example)\b|实施例|实验例/.test(normalized)) {
      return "example";
    }
  }
  return "mention";
}

function profilePatentRecords(profile: CompoundProfile): PatentRecord[] {
  return profile.patentReferences.map((reference) => ({
    publicationNumber: reference.publicationNumber,
    familyMembers: [reference.publicationNumber],
    applicants: [],
    inventors: [],
    relationship: reference.relationship,
    relationshipBasis: reference.relationshipBasis,
    claimsAvailable: false,
    descriptionAvailable: false,
    sourceUrl: reference.sourceUrl,
  }));
}

function scientificAliases(input: AggregateCompoundEvidenceInput, profile: CompoundProfile): string[] {
  return uniqueStrings([
    profile.title,
    input.compound?.title,
    ...(input.compound ? [] : [input.query]),
    ...(input.aliases ?? []),
    ...profile.synonyms,
  ])
    .filter((term) => {
      if (term.length < 2 || term.length > 100) return false;
      if (/^\d+(?:-\d+)+$/.test(term)) return false;
      if (/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i.test(term)) return false;
      if (!/\p{L}/u.test(term)) return false;

      // Short aliases such as "F2", "Re" or "CK" create large numbers of
      // unrelated literature and trial hits. Scientific retrieval therefore
      // uses compound-specific names only; short aliases remain available for
      // catalog lookup and UI display, but never become upstream evidence
      // queries by themselves.
      return (
        /ginsenoside|notoginsenoside|pseudoginsenoside|compound\s*k|人参皂苷|三七皂苷|拟人参皂苷/i.test(term) ||
        /^20\s*(?:\(\s*[SR]\s*\)|[SR])[-\s]?[A-Z]+\d*/i.test(term)
      );
    })
    .slice(0, 6);
}

function publicationEffectAliases(
  input: AggregateCompoundEvidenceInput,
  profile: CompoundProfile,
  aliases: string[],
): string[] {
  // PubChem's preferred title can collapse an explicit 20(S)/20(R) catalog
  // identity back to the generic parent name. Prefer the caller-confirmed
  // structure title so generic Rg2/Rg3/Rh records cannot populate a specific
  // stereoisomer page.
  const identityTitle = input.compound?.title ?? input.query ?? profile.title;
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

function sourceText(parts: Array<string | undefined>): string {
  return normalizeWhitespace(parts.filter(Boolean).join("\n"));
}

function publicationDocuments(records: PublicationRecord[]): EvidenceExtractionDocument[] {
  return records
    .filter((record) => Boolean(record.abstract))
    .map((record) => ({
      source: "europe_pmc" as const,
      sourceId: record.pmid ?? record.pmcid ?? record.doi ?? record.id,
      sourceUrl: record.sourceUrl,
      title: record.title,
      locator: "abstract",
      text: record.abstract as string,
    }));
}

function activityDocuments(records: ChEMBLActivity[]): EvidenceExtractionDocument[] {
  const documents: EvidenceExtractionDocument[] = [];
  for (const record of records) {
    const text = sourceText([
      record.assayDescription,
      record.target?.preferredName
        ? `Target: ${record.target.preferredName}${record.target.organism ? ` (${record.target.organism})` : ""}.`
        : undefined,
      record.standardType
        ? `Result: ${record.standardRelation ?? ""}${record.standardValue ?? record.standardTextValue ?? ""} ${record.standardUnits ?? ""} (${record.standardType}).`
        : undefined,
      record.activityComment,
      record.dataValidityComment,
    ]);
    if (text.length < 8) continue;
    documents.push({
      source: "chembl",
      sourceId: String(record.activityId),
      sourceUrl: record.sourceUrl,
      title: record.assayChemblId,
      locator: "ChEMBL activity and assay fields",
      text,
    });
  }
  return documents;
}

function trialDocuments(records: ClinicalTrialRecord[]): EvidenceExtractionDocument[] {
  return records.map((record) => ({
    source: "clinical_trials" as const,
    sourceId: record.nctId,
    sourceUrl: record.sourceUrl,
    title: record.briefTitle,
    locator: "study registration",
    text: sourceText([
      record.briefSummary,
      record.conditions.length ? `Conditions: ${record.conditions.join(", ")}.` : undefined,
      record.interventions.length
        ? `Interventions: ${record.interventions.map((item) => item.name).join(", ")}.`
        : undefined,
      record.primaryOutcomes.length
        ? `Primary outcomes: ${record.primaryOutcomes.join("; ")}.`
        : undefined,
      `Registration status: ${record.overallStatus ?? "unknown"}; hasResults=${record.hasResults}.`,
    ]),
  }));
}

function patentDocuments(records: PatentRecord[]): EvidenceExtractionDocument[] {
  const documents: EvidenceExtractionDocument[] = [];
  for (const record of records) {
    const text = sourceText([record.abstract, record.evidenceExcerpt]);
    if (text.length < 8) continue;
    documents.push({
      source: "epo_ops",
      sourceId: record.publicationNumber,
      sourceUrl: record.sourceUrl,
      title: record.title,
      locator: record.evidenceLocator ?? "abstract",
      text,
      patentRelationship: record.relationship,
    });
  }
  return documents;
}

function roundRobin<T>(groups: T[][]): T[] {
  const output: T[] = [];
  const longest = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < longest; index += 1) {
    for (const group of groups) {
      if (index < group.length) output.push(group[index]);
    }
  }
  return output;
}

function providedResolution(
  query: string,
  compound: CompoundCandidate,
): CompoundResolution {
  return {
    query,
    queryKind: /^\d+$/.test(query.trim()) ? "cid" : "name",
    status: "resolved",
    candidates: [compound],
    selected: compound,
    source: makeSourceResult({
      source: "pubchem",
      records: [compound],
      totalAvailable: 1,
    }),
  };
}

function unresolvedPubChemSource(
  resolution: CompoundResolution,
): SourceResult<CompoundProfile> {
  return makeSourceResult({
    source: "pubchem",
    status: resolution.source.status === "error" ? "error" : "partial",
    errors: [
      ...resolution.source.errors,
      {
        code: "compound_unresolved",
        message:
          resolution.status === "ambiguous"
            ? "Multiple PubChem structures matched; select a full stereochemical identity before aggregation."
            : "The compound could not be resolved in PubChem.",
        retryable: false,
      },
    ],
    truncated: resolution.source.truncated,
    totalAvailable: resolution.source.totalAvailable,
  });
}

function skippedForUnresolved<T>(
  source: "chembl" | "europe_pmc" | "clinical_trials" | "epo_ops" | "openai",
): SourceResult<T> {
  return skippedSourceResult(
    source,
    "compound_unresolved",
    "Source lookup was skipped until one PubChem structure is selected.",
  );
}

export async function aggregateCompoundEvidence(
  input: AggregateCompoundEvidenceInput,
): Promise<EvidenceAggregation> {
  const resolution = input.compound
    ? providedResolution(input.query, input.compound)
    : await resolvePubChemCompound(input.query, {
        timeoutMs: input.timeoutMs,
        maxRecords: 10,
        fetchImpl: input.fetchImpl,
      });

  if (resolution.status !== "resolved" || !resolution.selected) {
    const pubchem = unresolvedPubChemSource(resolution);
    const chembl = skippedSourceResult<ChEMBLActivity, ChEMBLMeta>(
      "chembl",
      "compound_unresolved",
      "Source lookup was skipped until one PubChem structure is selected.",
    );
    const europePmc = skippedForUnresolved<PublicationRecord>("europe_pmc");
    const clinicalTrials = skippedForUnresolved<ClinicalTrialRecord>("clinical_trials");
    const epoOps = skippedForUnresolved<PatentRecord>("epo_ops");
    const model = skippedForUnresolved<EvidenceClaim>("openai");
    return {
      query: input.query,
      generatedAt: new Date().toISOString(),
      resolution,
      sources: { pubchem, chembl, europePmc, clinicalTrials, epoOps, model },
      publications: [],
      bioactivities: [],
      targets: [],
      trials: [],
      patents: [],
      claims: [],
    };
  }

  const limits = { ...DEFAULT_LIMITS, ...(input.limits ?? {}) };
  const pubchem = await fetchPubChemProfile(resolution.selected, {
    timeoutMs: input.timeoutMs,
    fetchImpl: input.fetchImpl,
    maxPatentReferences: limits.pubchemPatents,
  });
  const fetchedProfile: CompoundProfile = pubchem.records[0] ?? {
    ...resolution.selected,
    synonyms: [],
    patentReferences: [],
    patentReferenceCount: 0,
  };
  const profile: CompoundProfile = input.compound
    ? { ...fetchedProfile, title: input.compound.title }
    : fetchedProfile;
  const aliases = scientificAliases(input, profile);
  const preciseAliases = publicationEffectAliases(input, profile, aliases);
  const requestOptions = { timeoutMs: input.timeoutMs, fetchImpl: input.fetchImpl };

  const [chembl, europePmc, clinicalTrials, epoOps] = await Promise.all([
    fetchChEMBLActivities(profile.inchiKey, {
      ...requestOptions,
      maxRecords: limits.chemblActivities,
      pageSize: Math.min(100, limits.chemblActivities),
    }),
    searchEuropePmcPublications(preciseAliases, {
      ...requestOptions,
      maxRecords: limits.publications,
      pageSize: Math.min(25, limits.publications),
    }),
    searchClinicalTrials(preciseAliases, {
      ...requestOptions,
      maxRecords: limits.trials,
      pageSize: Math.min(25, limits.trials),
    }),
    searchEpoOpsPatents(profile.title, input.epo, {
      ...requestOptions,
      aliases: preciseAliases,
      publicationNumbers: profile.patentReferences.map(
        (reference) => reference.publicationNumber,
      ),
      maxRecords: limits.patents,
      pageSize: Math.min(25, limits.patents),
      maxFullTextRecords: limits.patentFullText,
    }),
  ]);

  const publications = dedupePublications(europePmc.records);
  const bioactivities = chembl.records;
  const targetMap = new Map<string, ChEMBLTarget>();
  for (const activity of bioactivities) {
    if (activity.target) targetMap.set(activity.target.chemblId, activity.target);
  }
  const trials = Array.from(
    new Map(clinicalTrials.records.map((trial) => [trial.nctId, trial])).values(),
  );
  const patents = dedupePatentsByFamily([
    ...profilePatentRecords(profile),
    ...epoOps.records,
  ]);
  const modelDocuments = roundRobin([
    publicationDocuments(publications),
    activityDocuments(bioactivities),
    trialDocuments(trials),
    patentDocuments(patents),
  ]);
  const model = await extractEvidenceClaims(
    profile.title,
    modelDocuments,
    input.model
      ? {
          ...input.model,
          maxDocuments: limits.modelDocuments,
          fetchImpl: input.model.fetchImpl ?? input.fetchImpl,
        }
      : undefined,
  );
  const publicationEffectClaims = extractPublicationEffectClaims(
    publications,
    preciseAliases,
    {
      maxClaims: 40,
      maxClaimsPerPublication: 3,
    },
  );

  return {
    query: input.query,
    generatedAt: new Date().toISOString(),
    resolution,
    compound: profile,
    sources: { pubchem, chembl, europePmc, clinicalTrials, epoOps, model },
    publications,
    bioactivities,
    targets: Array.from(targetMap.values()),
    trials,
    patents,
    claims: dedupeEvidenceClaims([
      ...publicationEffectClaims,
      ...model.records,
    ]),
  };
}
