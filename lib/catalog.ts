/**
 * Curated first-wave ginsenoside monomer catalog.
 *
 * PubChem identity fields were checked on 2026-08-10 with the official PUG
 * REST name and property endpoints. CIDs are not inferred from third-party
 * catalogs. The PubChem Ra3 record is retained as a name match but is flagged
 * because its deposited structure has 34 undefined atom stereocenters.
 *
 * Exact-name lookup for 20(S)-Rg3 returned several records with different
 * stereochemical completeness. CID 9918693 is the fully specified record
 * (20 defined and 0 undefined atom stereocenters) whose PubChem synonyms
 * explicitly include "20(S)-Ginsenoside Rg3".
 */

export const PUBCHEM_CATALOG_VERIFICATION = {
  checkedAt: "2026-08-10",
  source: "PubChem PUG REST",
  baseUrl: "https://pubchem.ncbi.nlm.nih.gov/rest/pug",
} as const;

export const GINSENOSIDE_CATEGORIES = {
  protopanaxadiol: {
    labelZh: "原人参二醇型",
    labelEn: "Protopanaxadiol-type",
    abbreviation: "PPD",
  },
  protopanaxatriol: {
    labelZh: "原人参三醇型",
    labelEn: "Protopanaxatriol-type",
    abbreviation: "PPT",
  },
  ocotillol: {
    labelZh: "奥克梯隆型",
    labelEn: "Ocotillol-type",
    abbreviation: "OCT",
  },
  oleanane: {
    labelZh: "齐墩果烷型",
    labelEn: "Oleanane-type",
    abbreviation: "OLE",
  },
} as const;

export type GinsenosideCategory = keyof typeof GINSENOSIDE_CATEGORIES;

export type PubChemVerificationStatus =
  | "verified-full-stereochemistry"
  | "verified-name-only-stereochemistry-incomplete";

export interface GinsenosideCatalogEntry {
  /** Stable, URL-safe identifier. */
  slug: string;
  displayNameZh: string;
  displayNameEn: string;
  /** User-facing names only; CID and InChIKey are indexed automatically. */
  aliases: readonly string[];
  pubchemCid: number | null;
  pubchemInchiKey: string | null;
  pubchemVerification: PubChemVerificationStatus;
  pubchemNote?: string;
  requiresStereoisomerDisambiguation: boolean;
  /** Shared by entries that must be shown together during disambiguation. */
  stereoisomerGroup: string | null;
  category: GinsenosideCategory;
}

const CATALOG = [
  {
    slug: "ginsenoside-ra1",
    displayNameZh: "人参皂苷 Ra1",
    displayNameEn: "Ginsenoside Ra1",
    aliases: ["Ra1", "G-Ra1", "人参皂苷Ra1", "83459-41-0"],
    pubchemCid: 100941542,
    pubchemInchiKey: "KVMXBSSOCCPAOR-WWJNHZDPSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-ra2",
    displayNameZh: "人参皂苷 Ra2",
    displayNameEn: "Ginsenoside Ra2",
    aliases: ["Ra2", "G-Ra2", "人参皂苷Ra2", "83459-42-1"],
    pubchemCid: 100941543,
    pubchemInchiKey: "UEBIBJSWHIZNCA-BGPUAMRSSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-ra3",
    displayNameZh: "人参皂苷 Ra3",
    displayNameEn: "Ginsenoside Ra3",
    aliases: ["Ra3", "G-Ra3", "人参皂苷Ra3", "90985-77-6"],
    pubchemCid: 73157064,
    pubchemInchiKey: "QUNSGRLNZDSQJC-UHFFFAOYSA-N",
    pubchemVerification: "verified-name-only-stereochemistry-incomplete",
    pubchemNote:
      "PubChem exact-name match; deposited record has 0 defined and 34 undefined atom stereocenters. Confirm against a fully specified structure before exact-structure searches.",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rb1",
    displayNameZh: "人参皂苷 Rb1",
    displayNameEn: "Ginsenoside Rb1",
    aliases: ["Rb1", "G-Rb1", "人参皂苷Rb1", "41753-43-9"],
    pubchemCid: 9898279,
    pubchemInchiKey: "GZYPWOGIYAIIPV-JBDTYSNRSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rb2",
    displayNameZh: "人参皂苷 Rb2",
    displayNameEn: "Ginsenoside Rb2",
    aliases: ["Rb2", "G-Rb2", "人参皂苷Rb2", "11021-13-9"],
    pubchemCid: 6917976,
    pubchemInchiKey: "NODILNFGTFIURN-GZPRDHCNSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rb3",
    displayNameZh: "人参皂苷 Rb3",
    displayNameEn: "Ginsenoside Rb3",
    aliases: ["Rb3", "G-Rb3", "人参皂苷Rb3", "68406-26-8"],
    pubchemCid: 12912363,
    pubchemInchiKey: "NODILNFGTFIURN-USYOXQFSSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rc",
    displayNameZh: "人参皂苷 Rc",
    displayNameEn: "Ginsenoside Rc",
    aliases: ["Rc", "G-Rc", "人参皂苷Rc", "11021-14-0"],
    pubchemCid: 12855889,
    pubchemInchiKey: "JDCPEKQWFDWQLI-LUQKBWBOSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rd",
    displayNameZh: "人参皂苷 Rd",
    displayNameEn: "Ginsenoside Rd",
    aliases: ["Rd", "G-Rd", "人参皂苷Rd", "52705-93-8"],
    pubchemCid: 11679800,
    pubchemInchiKey: "RLDVZILFNVRJTL-IWFVLDDISA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-re",
    displayNameZh: "人参皂苷 Re",
    displayNameEn: "Ginsenoside Re",
    aliases: ["Re", "G-Re", "人参皂苷Re", "52286-59-6"],
    pubchemCid: 441921,
    pubchemInchiKey: "PWAOOJDMFUQOKB-WCZZMFLVSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rf",
    displayNameZh: "人参皂苷 Rf",
    displayNameEn: "Ginsenoside Rf",
    aliases: ["Rf", "G-Rf", "人参皂苷Rf", "52286-58-5"],
    pubchemCid: 441922,
    pubchemInchiKey: "UZIOUZHBUYLDHW-XUBRWZAZSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rg1",
    displayNameZh: "人参皂苷 Rg1",
    displayNameEn: "Ginsenoside Rg1",
    aliases: ["Rg1", "G-Rg1", "人参皂苷Rg1", "22427-39-0"],
    pubchemCid: 441923,
    pubchemInchiKey: "YURJSTAIMNSZAE-HHNZYBFYSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rg2-20s",
    displayNameZh: "20(S)-人参皂苷 Rg2",
    displayNameEn: "20(S)-Ginsenoside Rg2",
    aliases: [
      "20(S)-Rg2",
      "20S-Rg2",
      "S-Ginsenoside Rg2",
      "Ginsenoside Rg2",
      "Rg2",
      "人参皂苷 Rg2",
      "20(S)-人参皂苷Rg2",
    ],
    pubchemCid: 12912322,
    pubchemInchiKey: "AGBCLJAHARWNLA-GGBIZLPOSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-rg2-c20",
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rg2-20r",
    displayNameZh: "20(R)-人参皂苷 Rg2",
    displayNameEn: "20(R)-Ginsenoside Rg2",
    aliases: [
      "20(R)-Rg2",
      "20R-Rg2",
      "R-Ginsenoside Rg2",
      "Ginsenoside Rg2",
      "Rg2",
      "人参皂苷 Rg2",
      "20(R)-人参皂苷Rg2",
      "80952-72-3",
    ],
    pubchemCid: 75412551,
    pubchemInchiKey: "AGBCLJAHARWNLA-RPNKVCLTSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-rg2-c20",
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rg3-20s",
    displayNameZh: "20(S)-人参皂苷 Rg3",
    displayNameEn: "20(S)-Ginsenoside Rg3",
    aliases: [
      "20(S)-Rg3",
      "20S-Rg3",
      "S-Ginsenoside Rg3",
      "Ginsenoside Rg3",
      "Rg3",
      "人参皂苷 Rg3",
      "20(S)-人参皂苷Rg3",
      "14197-60-5",
      "11019-45-7",
    ],
    pubchemCid: 9918693,
    pubchemInchiKey: "RWXIFXNRCLMQCD-JBVRGBGGSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    pubchemNote:
      "Selected from multiple PubChem exact-name candidates because this record has complete atom stereochemistry and an explicit 20(S)-Rg3 synonym.",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-rg3-c20",
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rg3-20r",
    displayNameZh: "20(R)-人参皂苷 Rg3",
    displayNameEn: "20(R)-Ginsenoside Rg3",
    aliases: [
      "20(R)-Rg3",
      "20R-Rg3",
      "R-Ginsenoside Rg3",
      "Ginsenoside Rg3",
      "Rg3",
      "人参皂苷 Rg3",
      "20(R)-人参皂苷Rg3",
      "38243-03-7",
    ],
    pubchemCid: 46887680,
    pubchemInchiKey: "RWXIFXNRCLMQCD-CZIWJLDFSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-rg3-c20",
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rh1-20s",
    displayNameZh: "20(S)-人参皂苷 Rh1",
    displayNameEn: "20(S)-Ginsenoside Rh1",
    aliases: [
      "20(S)-Rh1",
      "20S-Rh1",
      "S-Ginsenoside Rh1",
      "Ginsenoside Rh1",
      "Rh1",
      "人参皂苷 Rh1",
      "20(S)-人参皂苷Rh1",
      "63223-86-9",
    ],
    pubchemCid: 12855920,
    pubchemInchiKey: "RAQNTCRNSXYLAH-RFCGZQMISA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-rh1-c20",
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rh1-20r",
    displayNameZh: "20(R)-人参皂苷 Rh1",
    displayNameEn: "20(R)-Ginsenoside Rh1",
    aliases: [
      "20(R)-Rh1",
      "20R-Rh1",
      "R-Ginsenoside Rh1",
      "Ginsenoside Rh1",
      "Rh1",
      "人参皂苷 Rh1",
      "20(R)-人参皂苷Rh1",
      "80952-71-2",
    ],
    pubchemCid: 21599923,
    pubchemInchiKey: "RAQNTCRNSXYLAH-PQYWRUIPSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-rh1-c20",
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rh2-20s",
    displayNameZh: "20(S)-人参皂苷 Rh2",
    displayNameEn: "20(S)-Ginsenoside Rh2",
    aliases: [
      "20(S)-Rh2",
      "20S-Rh2",
      "S-Ginsenoside Rh2",
      "Ginsenoside Rh2",
      "Rh2",
      "人参皂苷 Rh2",
      "20(S)-人参皂苷Rh2",
      "78214-33-2",
      "67400-17-3",
    ],
    pubchemCid: 119307,
    pubchemInchiKey: "CKUVNOCSBYYHIS-IRFFNABBSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-rh2-c20",
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rh2-20r",
    displayNameZh: "20(R)-人参皂苷 Rh2",
    displayNameEn: "20(R)-Ginsenoside Rh2",
    aliases: [
      "20(R)-Rh2",
      "20R-Rh2",
      "R-Ginsenoside Rh2",
      "Ginsenoside Rh2",
      "Rh2",
      "人参皂苷 Rh2",
      "20(R)-人参皂苷Rh2",
      "112246-15-8",
    ],
    pubchemCid: 54580480,
    pubchemInchiKey: "CKUVNOCSBYYHIS-SUEBGMEDSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-rh2-c20",
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-f1",
    displayNameZh: "人参皂苷 F1",
    displayNameEn: "Ginsenoside F1",
    aliases: ["F1", "G-F1", "人参皂苷F1", "53963-43-2"],
    pubchemCid: 9809542,
    pubchemInchiKey: "XNGXWSFSJIQMNC-FIYORUNESA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-f2",
    displayNameZh: "人参皂苷 F2",
    displayNameEn: "Ginsenoside F2",
    aliases: ["F2", "G-F2", "人参皂苷F2", "62025-49-4"],
    pubchemCid: 9918692,
    pubchemInchiKey: "SWIROVJVGRGSPO-JBVRGBGGSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-compound-k",
    displayNameZh: "人参皂苷化合物 K",
    displayNameEn: "Ginsenoside Compound K",
    aliases: [
      "Compound K",
      "Compound-K",
      "CompoundK",
      "Ginsenoside K",
      "Ginsenoside CK",
      "Ginsenoside C-K",
      "Ginsenoside M1",
      "IH901",
      "人参皂苷 CK",
      "人参皂苷化合物K",
      "化合物 K",
      "化合物K",
      "39262-14-1",
    ],
    pubchemCid: 9852086,
    pubchemInchiKey: "FVIZARNDLVOMSU-IRFFNABBSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    pubchemNote:
      "PubChem's Compound K record is the fully specified 20(S) structure. Generic Compound K input must still be confirmed against the submitted structure/InChIKey.",
    requiresStereoisomerDisambiguation: true,
    stereoisomerGroup: "ginsenoside-compound-k-c20",
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rk1",
    displayNameZh: "人参皂苷 Rk1",
    displayNameEn: "Ginsenoside Rk1",
    aliases: ["Rk1", "G-Rk1", "人参皂苷Rk1", "494753-69-4"],
    pubchemCid: 11499198,
    pubchemInchiKey: "KWDWBAISZWOAHD-MHOSXIPRSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rk3",
    displayNameZh: "人参皂苷 Rk3",
    displayNameEn: "Ginsenoside Rk3",
    aliases: ["Rk3", "G-Rk3", "人参皂苷Rk3", "364779-15-7"],
    pubchemCid: 75412555,
    pubchemInchiKey: "AVXFIVJSCUOFNT-QXPABTKOSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rg5",
    displayNameZh: "人参皂苷 Rg5",
    displayNameEn: "Ginsenoside Rg5",
    aliases: ["Rg5", "G-Rg5", "人参皂苷Rg5", "186763-78-0"],
    pubchemCid: 11550001,
    pubchemInchiKey: "NJUXRKMKOFXMRX-RNCAKNGISA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxadiol",
  },
  {
    slug: "ginsenoside-rg6",
    displayNameZh: "人参皂苷 Rg6",
    displayNameEn: "Ginsenoside Rg6",
    aliases: ["Rg6", "G-Rg6", "人参皂苷Rg6", "147419-93-0"],
    pubchemCid: 91895489,
    pubchemInchiKey: "ZVTVWDXRNMHGNY-JOGTXEPTSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-rh4",
    displayNameZh: "人参皂苷 Rh4",
    displayNameEn: "Ginsenoside Rh4",
    aliases: ["Rh4", "G-Rh4", "人参皂苷Rh4", "174721-08-5"],
    pubchemCid: 21599928,
    pubchemInchiKey: "OZTXYFOXQFKYRP-TXRYYSRHSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxatriol",
  },
  {
    slug: "ginsenoside-ro",
    displayNameZh: "人参皂苷 Ro",
    displayNameEn: "Ginsenoside Ro",
    aliases: ["Ro", "G-Ro", "人参皂苷Ro", "34367-04-9"],
    pubchemCid: 11815492,
    pubchemInchiKey: "NFZYDZXHKFHPGA-QQHDHSITSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "oleanane",
  },
  {
    slug: "pseudoginsenoside-f11",
    displayNameZh: "拟人参皂苷 F11",
    displayNameEn: "Pseudoginsenoside F11",
    aliases: [
      "F11",
      "Pseudo-ginsenoside F11",
      "Pseudoginsenoside-F11",
      "Pseudoginsenoside FII",
      "Ginsenoside A1",
      "PF11",
      "拟人参皂苷F11",
      "69884-00-0",
    ],
    pubchemCid: 21633072,
    pubchemInchiKey: "JBGYSAVRIDZNKA-NKECSCAMSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "ocotillol",
  },
  {
    slug: "notoginsenoside-r1",
    displayNameZh: "三七皂苷 R1",
    displayNameEn: "Notoginsenoside R1",
    aliases: [
      "Notoginsenoside-R1",
      "NotoginsenosideR1",
      "Sanchinoside R1",
      "Sanqi glucoside R1",
      "三七皂苷R1",
      "80418-24-2",
    ],
    pubchemCid: 441934,
    pubchemInchiKey: "LLPWNQMSUYAGQI-OOSPGMBYSA-N",
    pubchemVerification: "verified-full-stereochemistry",
    requiresStereoisomerDisambiguation: false,
    stereoisomerGroup: null,
    category: "protopanaxatriol",
  },
] as const satisfies readonly GinsenosideCatalogEntry[];

export const GINSENOSIDE_CATALOG: readonly GinsenosideCatalogEntry[] = CATALOG;

export function normalizeCompoundQuery(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{Separator}\p{Punctuation}\p{Symbol}]+/gu, "");
}

const SEARCH_INDEX = GINSENOSIDE_CATALOG.map((entry) => {
  const rawKeys = [
    entry.slug,
    entry.displayNameZh,
    entry.displayNameEn,
    ...entry.aliases,
    entry.pubchemCid === null ? "" : String(entry.pubchemCid),
    entry.pubchemInchiKey ?? "",
  ];

  return {
    entry,
    keys: [...new Set(rawKeys.map(normalizeCompoundQuery).filter(Boolean))],
  };
});

/**
 * Finds exact aliases first. If none exist, returns prefix/substring matches for
 * use in autocomplete. Generic epimer names intentionally return both entries.
 */
export function findCatalogMatches(
  query: string,
  limit = 12,
): readonly GinsenosideCatalogEntry[] {
  const normalizedQuery = normalizeCompoundQuery(query);
  if (!normalizedQuery || limit <= 0) return [];

  const exact = SEARCH_INDEX.filter(({ keys }) =>
    keys.includes(normalizedQuery),
  ).map(({ entry }) => entry);

  if (exact.length > 0) return exact.slice(0, limit);

  return SEARCH_INDEX.map(({ entry, keys }) => {
    const prefix = keys.some((key) => key.startsWith(normalizedQuery));
    const substring = keys.some((key) => key.includes(normalizedQuery));
    return { entry, score: prefix ? 2 : substring ? 1 : 0 };
  })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function getCatalogEntryBySlug(
  slug: string,
): GinsenosideCatalogEntry | undefined {
  const normalizedSlug = normalizeCompoundQuery(slug);
  return GINSENOSIDE_CATALOG.find(
    (entry) => normalizeCompoundQuery(entry.slug) === normalizedSlug,
  );
}

export function getCatalogEntryByPubchemCid(
  cid: number,
): GinsenosideCatalogEntry | undefined {
  return GINSENOSIDE_CATALOG.find((entry) => entry.pubchemCid === cid);
}
