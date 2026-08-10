import type {
  ChEMBLActivity,
  ChEMBLMeta,
  ChEMBLMolecule,
  ChEMBLTarget,
  SourceRequestOptions,
  SourceResult,
} from "../types";
import {
  clampInteger,
  fetchJson,
  makeSourceResult,
  parseFiniteNumber,
  skippedSourceResult,
  toSourceError,
  uniqueStrings,
} from "./common";

const CHEMBL_API = "https://www.ebi.ac.uk/chembl/api/data";

interface RawChEMBLMolecule {
  molecule_chembl_id?: string;
  pref_name?: string | null;
  natural_product?: number | null;
  molecule_properties?: {
    full_molformula?: string | null;
    full_mwt?: string | number | null;
  } | null;
  molecule_structures?: {
    canonical_smiles?: string | null;
    standard_inchi_key?: string | null;
  } | null;
}

interface RawChEMBLActivity {
  activity_id?: number;
  molecule_chembl_id?: string;
  assay_chembl_id?: string | null;
  assay_type?: string | null;
  assay_description?: string | null;
  bao_label?: string | null;
  target_chembl_id?: string | null;
  target_pref_name?: string | null;
  target_organism?: string | null;
  target_tax_id?: string | number | null;
  standard_type?: string | null;
  standard_relation?: string | null;
  standard_value?: string | number | null;
  standard_units?: string | null;
  standard_text_value?: string | null;
  pchembl_value?: string | number | null;
  activity_comment?: string | null;
  document_chembl_id?: string | null;
  document_journal?: string | null;
  document_year?: number | null;
  data_validity_comment?: string | null;
  potential_duplicate?: number | null;
}

interface RawChEMBLTarget {
  target_chembl_id?: string;
  pref_name?: string | null;
  target_type?: string | null;
  organism?: string | null;
  tax_id?: number | null;
  target_components?: Array<{
    accession?: string | null;
    component_description?: string | null;
  }>;
}

interface ChEMBLPageMeta {
  limit?: number;
  offset?: number;
  total_count?: number;
  next?: string | null;
}

interface ChEMBLMoleculeResponse {
  molecules?: RawChEMBLMolecule[];
  page_meta?: ChEMBLPageMeta;
}

interface ChEMBLActivityResponse {
  activities?: RawChEMBLActivity[];
  page_meta?: ChEMBLPageMeta;
}

interface ChEMBLTargetResponse {
  targets?: RawChEMBLTarget[];
  page_meta?: ChEMBLPageMeta;
}

function mapMolecule(raw: RawChEMBLMolecule, inchiKey: string): ChEMBLMolecule | undefined {
  const chemblId = raw.molecule_chembl_id?.trim();
  if (!chemblId) return undefined;
  return {
    chemblId,
    preferredName: raw.pref_name?.trim() || undefined,
    inchiKey,
    canonicalSmiles: raw.molecule_structures?.canonical_smiles ?? undefined,
    molecularFormula: raw.molecule_properties?.full_molformula ?? undefined,
    molecularWeight: parseFiniteNumber(raw.molecule_properties?.full_mwt),
    naturalProduct:
      typeof raw.natural_product === "number" ? raw.natural_product === 1 : undefined,
    chemblUrl: `https://www.ebi.ac.uk/chembl/explore/compound/${chemblId}`,
  };
}

function mapTarget(raw: RawChEMBLTarget): ChEMBLTarget | undefined {
  const chemblId = raw.target_chembl_id?.trim();
  if (!chemblId) return undefined;
  const components = raw.target_components ?? [];
  return {
    chemblId,
    preferredName: raw.pref_name?.trim() || chemblId,
    targetType: raw.target_type ?? undefined,
    organism: raw.organism ?? undefined,
    taxId: raw.tax_id ?? undefined,
    componentAccessions: uniqueStrings(components.map((item) => item.accession)),
    componentDescriptions: uniqueStrings(
      components.map((item) => item.component_description),
    ),
    chemblUrl: `https://www.ebi.ac.uk/chembl/explore/target/${chemblId}`,
  };
}

function fallbackTarget(raw: RawChEMBLActivity): ChEMBLTarget | undefined {
  const chemblId = raw.target_chembl_id?.trim();
  if (!chemblId) return undefined;
  return {
    chemblId,
    preferredName: raw.target_pref_name?.trim() || chemblId,
    organism: raw.target_organism ?? undefined,
    taxId: parseFiniteNumber(raw.target_tax_id),
    componentAccessions: [],
    componentDescriptions: [],
    chemblUrl: `https://www.ebi.ac.uk/chembl/explore/target/${chemblId}`,
  };
}

function mapActivity(
  raw: RawChEMBLActivity,
  targetMap: Map<string, ChEMBLTarget>,
): ChEMBLActivity | undefined {
  const activityId = Number(raw.activity_id);
  const moleculeChemblId = raw.molecule_chembl_id?.trim();
  if (!Number.isSafeInteger(activityId) || !moleculeChemblId) return undefined;
  const targetId = raw.target_chembl_id?.trim();
  return {
    activityId,
    moleculeChemblId,
    assayChemblId: raw.assay_chembl_id ?? undefined,
    assayType: raw.assay_type ?? undefined,
    assayDescription: raw.assay_description ?? undefined,
    baoFormat: raw.bao_label ?? undefined,
    target: (targetId ? targetMap.get(targetId) : undefined) ?? fallbackTarget(raw),
    standardType: raw.standard_type ?? undefined,
    standardRelation: raw.standard_relation ?? undefined,
    standardValue: parseFiniteNumber(raw.standard_value),
    standardUnits: raw.standard_units ?? undefined,
    standardTextValue: raw.standard_text_value ?? undefined,
    pchemblValue: parseFiniteNumber(raw.pchembl_value),
    activityComment: raw.activity_comment ?? undefined,
    documentChemblId: raw.document_chembl_id ?? undefined,
    documentJournal: raw.document_journal ?? undefined,
    documentYear: raw.document_year ?? undefined,
    dataValidityComment: raw.data_validity_comment ?? undefined,
    potentialDuplicate: raw.potential_duplicate === 1,
    sourceUrl: `https://www.ebi.ac.uk/chembl/explore/compound/${moleculeChemblId}`,
  };
}

async function loadTargets(
  targetIds: string[],
  options: SourceRequestOptions,
): Promise<{ targets: Map<string, ChEMBLTarget>; errors: ReturnType<typeof toSourceError>[] }> {
  const targets = new Map<string, ChEMBLTarget>();
  const errors: ReturnType<typeof toSourceError>[] = [];

  for (let index = 0; index < targetIds.length; index += 50) {
    const ids = targetIds.slice(index, index + 50);
    const url = `${CHEMBL_API}/target.json?target_chembl_id__in=${encodeURIComponent(ids.join(","))}&limit=50`;
    try {
      const response = await fetchJson<ChEMBLTargetResponse>(
        url,
        {},
        options.timeoutMs,
        options.fetchImpl,
      );
      for (const raw of response.targets ?? []) {
        const target = mapTarget(raw);
        if (target) targets.set(target.chemblId, target);
      }
    } catch (error) {
      errors.push(toSourceError(error, Math.floor(index / 50) + 1));
    }
  }

  return { targets, errors };
}

export async function fetchChEMBLActivities(
  rawInchiKey: string | undefined,
  options: SourceRequestOptions = {},
): Promise<SourceResult<ChEMBLActivity, ChEMBLMeta>> {
  const inchiKey = rawInchiKey?.trim().toUpperCase();
  if (!inchiKey || !/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(inchiKey)) {
    return skippedSourceResult<ChEMBLActivity, ChEMBLMeta>(
      "chembl",
      "missing_full_inchikey",
      "ChEMBL exact-structure lookup requires a complete InChIKey.",
    );
  }

  const maxRecords = clampInteger(options.maxRecords, 100, 1, 1_000);
  const pageSize = Math.min(
    maxRecords,
    clampInteger(options.pageSize, 100, 1, 1_000),
  );
  const errors: ReturnType<typeof toSourceError>[] = [];

  try {
    const moleculeUrl = `${CHEMBL_API}/molecule.json?molecule_structures__standard_inchi_key=${encodeURIComponent(inchiKey)}&limit=10`;
    const moleculeResponse = await fetchJson<ChEMBLMoleculeResponse>(
      moleculeUrl,
      {},
      options.timeoutMs,
      options.fetchImpl,
    );
    const exactRaw = (moleculeResponse.molecules ?? []).find(
      (item) => item.molecule_structures?.standard_inchi_key?.toUpperCase() === inchiKey,
    );
    const molecule = exactRaw ? mapMolecule(exactRaw, inchiKey) : undefined;
    if (!molecule) {
      return makeSourceResult({
        source: "chembl",
        records: [],
        totalAvailable: 0,
        meta: {
          matchedBy: "full_inchikey",
          activityCount: 0,
          targetCount: 0,
        },
      });
    }

    const rawActivities: RawChEMBLActivity[] = [];
    let totalAvailable = 0;
    let offset = 0;
    let page = 1;
    let nextCursor: string | undefined;

    while (rawActivities.length < maxRecords) {
      const limit = Math.min(pageSize, maxRecords - rawActivities.length);
      const activityUrl = `${CHEMBL_API}/activity.json?molecule_chembl_id=${encodeURIComponent(molecule.chemblId)}&limit=${limit}&offset=${offset}`;
      try {
        const response = await fetchJson<ChEMBLActivityResponse>(
          activityUrl,
          {},
          options.timeoutMs,
          options.fetchImpl,
        );
        const pageRecords = response.activities ?? [];
        totalAvailable = response.page_meta?.total_count ?? pageRecords.length;
        rawActivities.push(...pageRecords);
        offset += pageRecords.length;
        nextCursor = response.page_meta?.next ?? undefined;
        if (!response.page_meta?.next || pageRecords.length === 0) break;
        page += 1;
      } catch (error) {
        errors.push(toSourceError(error, page));
        break;
      }
    }

    const targetIds = uniqueStrings(rawActivities.map((item) => item.target_chembl_id));
    const targetOutcome = await loadTargets(targetIds, options);
    errors.push(...targetOutcome.errors);
    const seen = new Set<string>();
    const activities = rawActivities
      .map((item) => mapActivity(item, targetOutcome.targets))
      .filter((item): item is ChEMBLActivity => Boolean(item))
      .filter((item) => {
        const key = [
          item.activityId,
          item.assayChemblId,
          item.standardType,
          item.standardRelation,
          item.standardValue,
          item.standardUnits,
        ].join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const truncated = totalAvailable > rawActivities.length;
    if (truncated) {
      errors.push({
        code: "activity_limit_reached",
        message: `ChEMBL reports ${totalAvailable} activities; ${rawActivities.length} were loaded.`,
        retryable: false,
      });
    }

    return makeSourceResult({
      source: "chembl",
      records: activities,
      errors,
      status: errors.length > 0 || truncated ? "partial" : "success",
      totalAvailable,
      nextCursor: truncated ? nextCursor : undefined,
      truncated,
      meta: {
        molecule,
        matchedBy: "full_inchikey",
        activityCount: activities.length,
        targetCount: targetIds.length,
      },
    });
  } catch (error) {
    return makeSourceResult({
      source: "chembl",
      status: "error",
      errors: [toSourceError(error)],
      meta: {
        matchedBy: "full_inchikey",
        activityCount: 0,
        targetCount: 0,
      },
    });
  }
}
