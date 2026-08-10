import type {
  ClinicalTrialRecord,
  SourceRequestOptions,
  SourceResult,
} from "../types";
import {
  clampInteger,
  fetchJson,
  makeSourceResult,
  toSourceError,
  uniqueStrings,
} from "./common";

const CLINICAL_TRIALS_API = "https://clinicaltrials.gov/api/v2/studies";
const REQUEST_FIELDS = [
  "NCTId",
  "BriefTitle",
  "OfficialTitle",
  "OverallStatus",
  "StartDate",
  "CompletionDate",
  "Condition",
  "InterventionName",
  "InterventionType",
  "PrimaryOutcomeMeasure",
  "SecondaryOutcomeMeasure",
  "LeadSponsorName",
  "EnrollmentCount",
  "Phase",
  "StudyType",
  "HasResults",
  "BriefSummary",
].join(",");

interface RawClinicalTrial {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
      officialTitle?: string;
    };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string };
    };
    descriptionModule?: { briefSummary?: string };
    conditionsModule?: { conditions?: string[] };
    designModule?: {
      studyType?: string;
      phases?: string[];
      enrollmentInfo?: { count?: number };
    };
    armsInterventionsModule?: {
      interventions?: Array<{ type?: string; name?: string }>;
    };
    outcomesModule?: {
      primaryOutcomes?: Array<{ measure?: string }>;
      secondaryOutcomes?: Array<{ measure?: string }>;
    };
  };
  hasResults?: boolean;
}

interface ClinicalTrialsResponse {
  studies?: RawClinicalTrial[];
  nextPageToken?: string;
  totalCount?: number;
}

function buildInterventionQuery(terms: string[]): string {
  return uniqueStrings(terms)
    .map((term) => term.replace(/["\\]/g, " ").trim())
    .filter((term) => term.length >= 2)
    .slice(0, 6)
    .map((term) => `"${term}"`)
    .join(" OR ");
}

function mapTrial(raw: RawClinicalTrial): ClinicalTrialRecord | undefined {
  const protocol = raw.protocolSection;
  const identification = protocol?.identificationModule;
  const nctId = identification?.nctId?.trim();
  const briefTitle = identification?.briefTitle?.trim();
  if (!nctId || !briefTitle) return undefined;
  const design = protocol?.designModule;
  const status = protocol?.statusModule;
  const outcomes = protocol?.outcomesModule;

  return {
    nctId,
    briefTitle,
    officialTitle: identification?.officialTitle,
    studyType: design?.studyType,
    phases: uniqueStrings(design?.phases ?? []),
    overallStatus: status?.overallStatus,
    hasResults: raw.hasResults === true,
    startDate: status?.startDateStruct?.date,
    completionDate: status?.completionDateStruct?.date,
    enrollment: design?.enrollmentInfo?.count,
    leadSponsor: protocol?.sponsorCollaboratorsModule?.leadSponsor?.name,
    conditions: uniqueStrings(protocol?.conditionsModule?.conditions ?? []),
    interventions: (protocol?.armsInterventionsModule?.interventions ?? [])
      .filter((intervention) => Boolean(intervention.name?.trim()))
      .map((intervention) => ({
        type: intervention.type,
        name: intervention.name?.trim() as string,
      })),
    primaryOutcomes: uniqueStrings(
      outcomes?.primaryOutcomes?.map((outcome) => outcome.measure) ?? [],
    ),
    secondaryOutcomes: uniqueStrings(
      outcomes?.secondaryOutcomes?.map((outcome) => outcome.measure) ?? [],
    ),
    briefSummary: protocol?.descriptionModule?.briefSummary,
    sourceUrl: `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}`,
  };
}

export async function searchClinicalTrials(
  terms: string[],
  options: SourceRequestOptions = {},
): Promise<SourceResult<ClinicalTrialRecord>> {
  const query = buildInterventionQuery(terms);
  if (!query) {
    return makeSourceResult({
      source: "clinical_trials",
      status: "error",
      errors: [
        {
          code: "empty_query",
          message: "ClinicalTrials.gov search requires at least one compound name.",
          retryable: false,
        },
      ],
    });
  }

  const maxRecords = clampInteger(options.maxRecords, 25, 1, 1_000);
  const pageSize = Math.min(
    maxRecords,
    clampInteger(options.pageSize, 25, 1, 100),
  );
  const records: ClinicalTrialRecord[] = [];
  const seen = new Set<string>();
  const errors: ReturnType<typeof toSourceError>[] = [];
  let pageToken: string | undefined;
  let nextPageToken: string | undefined;
  let totalCount = 0;
  let page = 1;

  while (records.length < maxRecords) {
    const params = new URLSearchParams({
      "query.intr": query,
      pageSize: String(Math.min(pageSize, maxRecords - records.length)),
      format: "json",
      fields: REQUEST_FIELDS,
      countTotal: page === 1 ? "true" : "false",
    });
    if (pageToken) params.set("pageToken", pageToken);

    try {
      const response = await fetchJson<ClinicalTrialsResponse>(
        `${CLINICAL_TRIALS_API}?${params.toString()}`,
        {},
        options.timeoutMs,
        options.fetchImpl,
      );
      if (typeof response.totalCount === "number") totalCount = response.totalCount;
      const pageRecords = (response.studies ?? [])
        .map(mapTrial)
        .filter((record): record is ClinicalTrialRecord => Boolean(record));
      for (const record of pageRecords) {
        if (seen.has(record.nctId)) continue;
        seen.add(record.nctId);
        records.push(record);
        if (records.length >= maxRecords) break;
      }
      nextPageToken = response.nextPageToken;
      if (!nextPageToken || pageRecords.length === 0) break;
      pageToken = nextPageToken;
      page += 1;
    } catch (error) {
      errors.push(toSourceError(error, page));
      break;
    }
  }

  if (totalCount === 0) totalCount = records.length;
  const truncated = totalCount > records.length || Boolean(nextPageToken && records.length >= maxRecords);
  if (truncated && records.length >= maxRecords) {
    errors.push({
      code: "trial_limit_reached",
      message: `ClinicalTrials.gov reports ${totalCount} matching studies; ${records.length} were loaded.`,
      retryable: false,
    });
  }

  return makeSourceResult({
    source: "clinical_trials",
    records,
    errors,
    status: errors.length > 0 ? (records.length > 0 ? "partial" : "error") : "success",
    totalAvailable: totalCount,
    nextCursor: truncated ? nextPageToken : undefined,
    truncated,
  });
}
