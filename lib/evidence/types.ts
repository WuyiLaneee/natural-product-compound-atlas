export type EvidenceSource =
  | "pubchem"
  | "chembl"
  | "europe_pmc"
  | "clinical_trials"
  | "epo_ops"
  | "openai";

export type SourceStatus = "success" | "partial" | "skipped" | "error";

export interface SourceError {
  code: string;
  message: string;
  retryable: boolean;
  httpStatus?: number;
  page?: number;
}

export interface SourceResult<T, M = Record<string, unknown>> {
  source: EvidenceSource;
  status: SourceStatus;
  records: T[];
  errors: SourceError[];
  fetchedAt: string;
  totalAvailable?: number;
  nextCursor?: string;
  truncated: boolean;
  meta?: M;
}

export interface SourceRequestOptions {
  timeoutMs?: number;
  maxRecords?: number;
  pageSize?: number;
  fetchImpl?: typeof fetch;
}

export type CompoundQueryKind = "cid" | "inchikey" | "name";

export interface CompoundCandidate {
  cid: number;
  title: string;
  molecularFormula?: string;
  molecularWeight?: number;
  canonicalSmiles?: string;
  isomericSmiles?: string;
  inchi?: string;
  inchiKey?: string;
  pubchemUrl: string;
}

export type CompoundResolutionStatus =
  | "resolved"
  | "ambiguous"
  | "not_found"
  | "unsupported";

export interface CompoundResolution {
  query: string;
  queryKind: CompoundQueryKind;
  status: CompoundResolutionStatus;
  candidates: CompoundCandidate[];
  selected?: CompoundCandidate;
  source: SourceResult<CompoundCandidate>;
}

export interface PubChemPatentReference {
  publicationNumber: string;
  relationship: "mention";
  relationshipBasis: "pubchem_xref";
  sourceUrl: string;
}

export interface CompoundProfile extends CompoundCandidate {
  synonyms: string[];
  patentReferences: PubChemPatentReference[];
  patentReferenceCount: number;
}

export interface ChEMBLMolecule {
  chemblId: string;
  preferredName?: string;
  inchiKey: string;
  canonicalSmiles?: string;
  molecularFormula?: string;
  molecularWeight?: number;
  naturalProduct?: boolean;
  chemblUrl: string;
}

export interface ChEMBLTarget {
  chemblId: string;
  preferredName: string;
  targetType?: string;
  organism?: string;
  taxId?: number;
  componentAccessions: string[];
  componentDescriptions: string[];
  chemblUrl: string;
}

export interface ChEMBLActivity {
  activityId: number;
  moleculeChemblId: string;
  assayChemblId?: string;
  assayType?: string;
  assayDescription?: string;
  baoFormat?: string;
  target?: ChEMBLTarget;
  standardType?: string;
  standardRelation?: string;
  standardValue?: number;
  standardUnits?: string;
  standardTextValue?: string;
  pchemblValue?: number;
  activityComment?: string;
  documentChemblId?: string;
  documentJournal?: string;
  documentYear?: number;
  dataValidityComment?: string;
  potentialDuplicate: boolean;
  sourceUrl: string;
}

export interface ChEMBLMeta {
  molecule?: ChEMBLMolecule;
  matchedBy: "full_inchikey";
  activityCount: number;
  targetCount: number;
}

export type FullTextStatus =
  | "open_pdf"
  | "html_not_pdf"
  | "needs_institution"
  | "no_open_pdf"
  | "unknown";

export interface PublicationRecord {
  id: string;
  sourceDatabase: string;
  title: string;
  authors: string[];
  authorString?: string;
  year?: number;
  publicationDate?: string;
  publicationTypes: string[];
  journal?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  abstract?: string;
  keywords: string[];
  meshTerms: string[];
  citedByCount?: number;
  isOpenAccess: boolean;
  fullTextStatus: FullTextStatus;
  fullTextUrl?: string;
  sourceUrl: string;
}

export interface ClinicalTrialRecord {
  nctId: string;
  briefTitle: string;
  officialTitle?: string;
  studyType?: string;
  phases: string[];
  overallStatus?: string;
  hasResults: boolean;
  startDate?: string;
  completionDate?: string;
  enrollment?: number;
  leadSponsor?: string;
  conditions: string[];
  interventions: Array<{
    type?: string;
    name: string;
  }>;
  primaryOutcomes: string[];
  secondaryOutcomes: string[];
  briefSummary?: string;
  sourceUrl: string;
}

export type PatentRelationship = "mention" | "example" | "claim";

export interface PatentRecord {
  publicationNumber: string;
  country?: string;
  documentNumber?: string;
  kind?: string;
  familyId?: string;
  familyMembers: string[];
  title?: string;
  abstract?: string;
  publicationDate?: string;
  applicants: string[];
  inventors: string[];
  relationship: PatentRelationship;
  relationshipBasis:
    | "pubchem_xref"
    | "epo_title_or_abstract"
    | "epo_description"
    | "epo_worked_example"
    | "epo_claims";
  evidenceLocator?: string;
  evidenceExcerpt?: string;
  claimsAvailable: boolean;
  descriptionAvailable: boolean;
  sourceUrl: string;
}

export type EvidenceLevel = "T1" | "T2" | "T3" | "T4" | "T5";

export const EVIDENCE_LEVEL_DEFINITIONS: Record<EvidenceLevel, string> = {
  T1: "Quantitative direct binding evidence, such as SPR, ITC, MST, radioligand binding, or an equivalent direct biophysical assay.",
  T2: "Single-target biochemical or functional evidence without direct quantitative binding.",
  T3: "Cellular causal evidence using knockdown, knockout, overexpression, rescue, or a comparably target-specific perturbation.",
  T4: "Animal or human phenotype evidence, or pathway/biomarker change without target-specific causal proof.",
  T5: "Computational prediction only, including docking, network pharmacology, or machine learning.",
};

export const PATENT_RELATIONSHIP_DEFINITIONS: Record<PatentRelationship, string> = {
  claim: "The compound or a sufficiently specific synonym appears in a patent claim.",
  example: "The compound is used, prepared, or tested in a worked example but is not identified in a claim.",
  mention: "The compound is mentioned or database-linked without claim or worked-example evidence.",
};

export type EvidenceClaimType =
  | "efficacy"
  | "target"
  | "mechanism"
  | "safety"
  | "pharmacokinetic";

export interface EvidenceClaim {
  claimType: EvidenceClaimType;
  summary: string;
  effect?: string;
  target?: string;
  direction?: "increase" | "decrease" | "activate" | "inhibit" | "bind" | "mixed" | "unknown";
  evidenceLevel: EvidenceLevel;
  modelType?: "biochemical" | "cell" | "animal" | "human" | "computational" | "other";
  species?: string;
  induction?: string;
  intervention?: string;
  dose?: string;
  endpoints: string[];
  patentRelationship?: PatentRelationship;
  source: {
    source: EvidenceSource;
    sourceId: string;
    sourceUrl?: string;
    locator: string;
    excerpt: string;
  };
  confidence: number;
  reviewStatus: "machine_unreviewed";
  modelName: string;
}

export interface EvidenceExtractionDocument {
  source: Exclude<EvidenceSource, "openai">;
  sourceId: string;
  sourceUrl?: string;
  title?: string;
  locator: string;
  text: string;
  patentRelationship?: PatentRelationship;
}

export interface EpoOpsCredentials {
  clientId: string;
  clientSecret: string;
}

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxDocuments?: number;
  batchSize?: number;
  maxInputCharacters?: number;
  fetchImpl?: typeof fetch;
}

export interface AggregateLimits {
  pubchemPatents?: number;
  chemblActivities?: number;
  publications?: number;
  trials?: number;
  patents?: number;
  patentFullText?: number;
  modelDocuments?: number;
}

export interface AggregateCompoundEvidenceInput {
  query: string;
  compound?: CompoundCandidate;
  aliases?: string[];
  epo?: EpoOpsCredentials;
  model?: OpenAICompatibleConfig;
  limits?: AggregateLimits;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface AggregateEvidenceSources {
  pubchem: SourceResult<CompoundProfile>;
  chembl: SourceResult<ChEMBLActivity, ChEMBLMeta>;
  europePmc: SourceResult<PublicationRecord>;
  clinicalTrials: SourceResult<ClinicalTrialRecord>;
  epoOps: SourceResult<PatentRecord>;
  model: SourceResult<EvidenceClaim>;
}

export interface EvidenceAggregation {
  query: string;
  generatedAt: string;
  resolution: CompoundResolution;
  compound?: CompoundProfile;
  sources: AggregateEvidenceSources;
  publications: PublicationRecord[];
  bioactivities: ChEMBLActivity[];
  targets: ChEMBLTarget[];
  trials: ClinicalTrialRecord[];
  patents: PatentRecord[];
  claims: EvidenceClaim[];
}
