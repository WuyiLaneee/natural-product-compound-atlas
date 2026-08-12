import { GENERATED_CHINESE_COMPOUND_ENTRIES } from "./chinese-compounds.generated";

export type ChineseCompoundSource =
  | "cosmetic-small-molecules-pubchem-csv"
  | "curated-extension";

export type ChineseCompoundEntry = {
  labelZh: string;
  englishName: string;
  cid: number;
  source: ChineseCompoundSource;
  aliases?: string[];
  category?: string;
};

export type CuratedCompoundDefinition = Omit<
  ChineseCompoundEntry,
  "cid" | "source"
>;

/**
 * Curated Chinese names that can be translated into an unambiguous PubChem
 * query. Broad families (for example, "黄酮" or "人参皂苷") are deliberately
 * excluded because they do not identify one chemical entity.
 */
const CURATED_COMPOUND_DEFINITIONS: readonly CuratedCompoundDefinition[] = [
  {
    labelZh: "姜黄素",
    englishName: "Curcumin",
    aliases: ["薑黃素"],
    category: "天然多酚",
  },
  {
    labelZh: "白藜芦醇",
    englishName: "Resveratrol",
    aliases: ["白藜蘆醇"],
    category: "天然多酚",
  },
  { labelZh: "槲皮素", englishName: "Quercetin", category: "黄酮" },
  {
    labelZh: "山奈酚",
    englishName: "Kaempferol",
    aliases: ["山柰酚"],
    category: "黄酮",
  },
  { labelZh: "木犀草素", englishName: "Luteolin", category: "黄酮" },
  { labelZh: "芹菜素", englishName: "Apigenin", category: "黄酮" },
  {
    labelZh: "非瑟酮",
    englishName: "Fisetin",
    aliases: ["漆黄素", "漆黃素"],
    category: "黄酮",
  },
  {
    labelZh: "芦丁",
    englishName: "Rutin",
    aliases: ["蘆丁", "芸香苷"],
    category: "黄酮苷",
  },
  {
    labelZh: "橙皮苷",
    englishName: "Hesperidin",
    aliases: ["橙皮甙"],
    category: "黄酮苷",
  },
  { labelZh: "柚皮素", englishName: "Naringenin", category: "黄酮" },
  {
    labelZh: "柚皮苷",
    englishName: "Naringin",
    aliases: ["柚皮甙"],
    category: "黄酮苷",
  },
  {
    labelZh: "表没食子儿茶素没食子酸酯",
    englishName: "Epigallocatechin gallate",
    aliases: ["表沒食子兒茶素沒食子酸酯", "EGCG", "茶多酚EGCG"],
    category: "茶多酚",
  },
  {
    labelZh: "表儿茶素",
    englishName: "Epicatechin",
    aliases: ["表兒茶素", "负表儿茶素", "負表兒茶素"],
    category: "茶多酚",
  },
  {
    labelZh: "没食子酸",
    englishName: "Gallic acid",
    aliases: ["沒食子酸", "五倍子酸"],
    category: "酚酸",
  },
  { labelZh: "鞣花酸", englishName: "Ellagic acid", category: "天然多酚" },
  { labelZh: "阿魏酸", englishName: "Ferulic acid", category: "酚酸" },
  { labelZh: "咖啡酸", englishName: "Caffeic acid", category: "酚酸" },
  {
    labelZh: "绿原酸",
    englishName: "Chlorogenic acid",
    aliases: ["綠原酸"],
    category: "酚酸",
  },
  {
    labelZh: "迷迭香酸",
    englishName: "Rosmarinic acid",
    category: "酚酸",
  },
  {
    labelZh: "染料木素",
    englishName: "Genistein",
    aliases: ["金雀异黄素", "金雀異黃素"],
    category: "异黄酮",
  },
  {
    labelZh: "大豆苷元",
    englishName: "Daidzein",
    aliases: ["大豆甙元"],
    category: "异黄酮",
  },
  { labelZh: "葛根素", englishName: "Puerarin", category: "异黄酮苷" },
  {
    labelZh: "紫檀芪",
    englishName: "Pterostilbene",
    aliases: ["紫檀茋"],
    category: "天然多酚",
  },
  {
    labelZh: "羟基酪醇",
    englishName: "Hydroxytyrosol",
    aliases: ["羥基酪醇"],
    category: "天然多酚",
  },
  {
    labelZh: "尿石素A",
    englishName: "Urolithin A",
    aliases: ["尿石素A型"],
    category: "天然产物代谢物",
  },
  { labelZh: "青蒿素", englishName: "Artemisinin", category: "萜类" },
  { labelZh: "紫杉醇", englishName: "Paclitaxel", category: "萜类" },
  {
    labelZh: "熊果酸",
    englishName: "Ursolic acid",
    aliases: ["乌索酸", "烏索酸"],
    category: "三萜",
  },
  {
    labelZh: "齐墩果酸",
    englishName: "Oleanolic acid",
    aliases: ["齊墩果酸"],
    category: "三萜",
  },
  {
    labelZh: "白桦脂酸",
    englishName: "Betulinic acid",
    aliases: ["白樺脂酸"],
    category: "三萜",
  },
  {
    labelZh: "18β-甘草次酸",
    englishName: "Glycyrrhetinic acid",
    aliases: ["甘草次酸", "18beta-甘草次酸", "18β甘草次酸"],
    category: "三萜",
  },
  {
    labelZh: "甘草酸",
    englishName: "Glycyrrhizic acid",
    aliases: ["甘草甜素"],
    category: "三萜皂苷",
  },
  {
    labelZh: "积雪草苷",
    englishName: "Asiaticoside",
    aliases: ["積雪草苷"],
    category: "三萜皂苷",
  },
  {
    labelZh: "羟基积雪草苷",
    englishName: "Madecassoside",
    aliases: ["羥基積雪草苷"],
    category: "三萜皂苷",
  },
  {
    labelZh: "黄芪甲苷",
    englishName: "Astragaloside IV",
    aliases: ["黃芪甲苷", "黄芪皂苷IV", "黃芪皂苷IV"],
    category: "三萜皂苷",
  },
  { labelZh: "芍药苷", englishName: "Paeoniflorin", category: "单萜苷" },
  {
    labelZh: "红景天苷",
    englishName: "Salidroside",
    aliases: ["紅景天苷"],
    category: "苯丙素苷",
  },
  { labelZh: "天麻素", englishName: "Gastrodin", category: "酚性糖苷" },
  {
    labelZh: "黄芩苷",
    englishName: "Baicalin",
    aliases: ["黃芩苷", "黄芩甙"],
    category: "黄酮苷",
  },
  {
    labelZh: "黄芩素",
    englishName: "Baicalein",
    aliases: ["黃芩素"],
    category: "黄酮",
  },
  {
    labelZh: "汉黄芩素",
    englishName: "Wogonin",
    aliases: ["漢黃芩素"],
    category: "黄酮",
  },
  {
    labelZh: "灯盏花乙素",
    englishName: "Scutellarin",
    aliases: ["燈盞花乙素", "野黄芩苷", "野黃芩苷"],
    category: "黄酮苷",
  },
  {
    labelZh: "和厚朴酚",
    englishName: "Honokiol",
    aliases: ["和厚朴醇"],
    category: "木脂素",
  },
  { labelZh: "厚朴酚", englishName: "Magnolol", category: "木脂素" },
  {
    labelZh: "人参皂苷Rg1",
    englishName: "Ginsenoside Rg1",
    aliases: ["人參皂苷Rg1", "人参皂甙Rg1"],
    category: "人参皂苷单体",
  },
  {
    labelZh: "人参皂苷Rb1",
    englishName: "Ginsenoside Rb1",
    aliases: ["人參皂苷Rb1", "人参皂甙Rb1"],
    category: "人参皂苷单体",
  },
  {
    labelZh: "人参皂苷Re",
    englishName: "Ginsenoside Re",
    aliases: ["人參皂苷Re", "人参皂甙Re"],
    category: "人参皂苷单体",
  },
  {
    labelZh: "人参皂苷化合物K",
    englishName: "Ginsenoside Compound K",
    aliases: ["人參皂苷化合物K", "人参皂苷CK", "人参皂苷Compound K"],
    category: "人参皂苷代谢物",
  },
  {
    labelZh: "小檗碱",
    englishName: "Berberine",
    aliases: ["黃連素", "黄连素", "小蘗鹼"],
    category: "生物碱",
  },
  {
    labelZh: "胡椒碱",
    englishName: "Piperine",
    aliases: ["胡椒鹼"],
    category: "生物碱",
  },
  { labelZh: "辣椒素", englishName: "Capsaicin", category: "生物碱样天然产物" },
  { labelZh: "咖啡因", englishName: "Caffeine", category: "嘌呤生物碱" },
  {
    labelZh: "可可碱",
    englishName: "Theobromine",
    aliases: ["可可鹼"],
    category: "嘌呤生物碱",
  },
  {
    labelZh: "葫芦巴碱",
    englishName: "Trigonelline",
    aliases: ["葫蘆巴鹼"],
    category: "生物碱",
  },
  {
    labelZh: "苦参碱",
    englishName: "Matrine",
    aliases: ["苦參鹼"],
    category: "生物碱",
  },
  {
    labelZh: "氧化苦参碱",
    englishName: "Oxymatrine",
    aliases: ["氧化苦參鹼"],
    category: "生物碱",
  },
  {
    labelZh: "喜树碱",
    englishName: "Camptothecin",
    aliases: ["喜樹鹼"],
    category: "生物碱",
  },
  {
    labelZh: "秋水仙碱",
    englishName: "Colchicine",
    aliases: ["秋水仙鹼"],
    category: "生物碱",
  },
  {
    labelZh: "烟酰胺",
    englishName: "Nicotinamide",
    aliases: ["菸醯胺", "维生素B3酰胺", "維生素B3醯胺"],
    category: "功能分子",
  },
  { labelZh: "腺苷", englishName: "Adenosine", category: "核苷" },
  {
    labelZh: "褪黑素",
    englishName: "Melatonin",
    aliases: ["褪黑激素"],
    category: "功能分子",
  },
  {
    labelZh: "辅酶Q10",
    englishName: "Coenzyme Q10",
    aliases: ["輔酶Q10", "泛醌10", "泛醌-10"],
    category: "功能分子",
  },
  {
    labelZh: "α-硫辛酸",
    englishName: "Lipoic acid",
    aliases: ["硫辛酸", "alpha-硫辛酸", "阿尔法硫辛酸", "阿爾法硫辛酸"],
    category: "功能分子",
  },
  {
    labelZh: "还原型谷胱甘肽",
    englishName: "Glutathione",
    aliases: ["還原型穀胱甘肽", "谷胱甘肽GSH", "GSH"],
    category: "功能肽",
  },
  { labelZh: "肌酸", englishName: "Creatine", category: "功能分子" },
  { labelZh: "牛磺酸", englishName: "Taurine", category: "功能分子" },
  {
    labelZh: "β-烟酰胺单核苷酸",
    englishName: "beta-Nicotinamide mononucleotide",
    aliases: [
      "β-菸醯胺單核苷酸",
      "beta-烟酰胺单核苷酸",
      "贝塔烟酰胺单核苷酸",
      "NMN",
    ],
    category: "核苷酸",
  },
  {
    labelZh: "亚精胺",
    englishName: "Spermidine",
    aliases: ["亞精胺"],
    category: "多胺",
  },
  {
    labelZh: "麦角硫因",
    englishName: "Ergothioneine",
    aliases: ["麥角硫因", "L-麦角硫因", "L-麥角硫因"],
    category: "功能分子",
  },
  { labelZh: "肌肽", englishName: "Carnosine", category: "功能肽" },
  {
    labelZh: "α-熊果苷",
    englishName: "alpha-Arbutin",
    aliases: ["alpha-熊果苷", "阿尔法熊果苷", "阿爾法熊果苷"],
    category: "功效分子",
  },
  {
    labelZh: "β-熊果苷",
    englishName: "beta-Arbutin",
    aliases: ["beta-熊果苷", "贝塔熊果苷", "貝塔熊果苷"],
    category: "功效分子",
  },
  {
    labelZh: "氨甲环酸",
    englishName: "Tranexamic acid",
    aliases: ["氨甲環酸", "传明酸", "傳明酸", "凝血酸"],
    category: "药用小分子",
  },
  {
    labelZh: "水杨酸",
    englishName: "Salicylic acid",
    aliases: ["水楊酸"],
    category: "药用小分子",
  },
  { labelZh: "壬二酸", englishName: "Azelaic acid", category: "药用小分子" },
  {
    labelZh: "曲酸",
    englishName: "Kojic acid",
    aliases: ["麴酸", "曲菌酸"],
    category: "功效分子",
  },
  {
    labelZh: "全反式维甲酸",
    englishName: "Tretinoin",
    aliases: ["全反式維甲酸", "维A酸", "維A酸", "全反式视黄酸"],
    category: "药用小分子",
  },
  {
    labelZh: "视黄醇",
    englishName: "Retinol",
    aliases: ["視黃醇", "维生素A1", "維生素A1"],
    category: "维生素",
  },
  {
    labelZh: "L-抗坏血酸",
    englishName: "Ascorbic acid",
    aliases: ["L-抗壞血酸", "抗坏血酸", "抗壞血酸", "维生素C", "維生素C"],
    category: "维生素",
  },
  {
    labelZh: "α-生育酚",
    englishName: "alpha-Tocopherol",
    aliases: ["alpha-生育酚", "阿尔法生育酚", "阿爾法生育酚", "维生素Eα"],
    category: "维生素",
  },
];

const CURATED_EXTENSION_CIDS = new Map<string, number>([
  ["luteolin", 5280445],
  ["apigenin", 5280443],
  ["fisetin", 5281614],
  ["naringenin", 439246],
  ["epicatechin", 72276],
  ["chlorogenic acid", 1794427],
  ["rosmarinic acid", 5281792],
  ["genistein", 5280961],
  ["daidzein", 5281708],
  ["puerarin", 5281807],
  ["pterostilbene", 5281727],
  ["hydroxytyrosol", 82755],
  ["urolithin a", 5488186],
  ["paclitaxel", 36314],
  ["betulinic acid", 64971],
  ["astragaloside iv", 13943297],
  ["paeoniflorin", 442534],
  ["salidroside", 159278],
  ["gastrodin", 115067],
  ["baicalin", 64982],
  ["scutellarin", 185617],
  ["berberine", 2353],
  ["trigonelline", 5570],
  ["oxymatrine", 24864132],
  ["camptothecin", 24360],
  ["colchicine", 6167],
  ["coenzyme q10", 5281915],
  ["lipoic acid", 6112],
  ["glutathione", 124886],
  ["beta-nicotinamide mononucleotide", 14180],
  ["carnosine", 439224],
  ["beta-arbutin", 440936],
  ["tranexamic acid", 5526],
  ["tretinoin", 444795],
  ["alpha-tocopherol", 14985],
]);

function normalizeRegistryIdentifier(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

function claimRegistryKey(
  index: Map<string, number>,
  key: string,
  entryIndex: number,
  description: string,
): void {
  const existingIndex = index.get(key);
  if (existingIndex !== undefined && existingIndex !== entryIndex) {
    throw new Error(
      `Conflicting Chinese compound registry ${description}: "${key}" maps to entries ${existingIndex} and ${entryIndex}.`,
    );
  }
  index.set(key, entryIndex);
}

/**
 * Merge the CSV-backed registry with the prior curated aliases. Matching may
 * use Chinese name, English name, or an explicitly reviewed PubChem CID.
 * Multiple matches are a data conflict and stop the build instead of silently
 * selecting one chemical entity.
 */
export function buildChineseCompoundRegistry(
  generatedEntries: readonly ChineseCompoundEntry[],
  curatedDefinitions: readonly CuratedCompoundDefinition[] = [],
): ChineseCompoundEntry[] {
  const entries: ChineseCompoundEntry[] = generatedEntries.map((entry) => ({
    ...entry,
    aliases: entry.aliases ? [...entry.aliases] : undefined,
  }));
  const chineseIndex = new Map<string, number>();
  const englishIndex = new Map<string, number>();
  const cidIndex = new Map<string, number>();

  const indexEntry = (entry: ChineseCompoundEntry, entryIndex: number): void => {
    claimRegistryKey(
      chineseIndex,
      normalizeChineseCompoundTerm(entry.labelZh),
      entryIndex,
      "Chinese name",
    );
    for (const alias of entry.aliases ?? []) {
      claimRegistryKey(
        chineseIndex,
        normalizeChineseCompoundTerm(alias),
        entryIndex,
        "Chinese alias",
      );
    }
    claimRegistryKey(
      englishIndex,
      normalizeRegistryIdentifier(entry.englishName),
      entryIndex,
      "English name",
    );
    claimRegistryKey(cidIndex, String(entry.cid), entryIndex, "PubChem CID");
  };

  entries.forEach(indexEntry);

  for (const definition of curatedDefinitions) {
    const englishKey = normalizeRegistryIdentifier(definition.englishName);
    const supplementalCid = CURATED_EXTENSION_CIDS.get(englishKey);
    const candidateIndexes = new Set<number>();
    const addCandidate = (candidate: number | undefined): void => {
      if (candidate !== undefined) candidateIndexes.add(candidate);
    };

    addCandidate(
      chineseIndex.get(normalizeChineseCompoundTerm(definition.labelZh)),
    );
    addCandidate(englishIndex.get(englishKey));
    if (supplementalCid !== undefined) {
      addCandidate(cidIndex.get(String(supplementalCid)));
    }
    for (const alias of definition.aliases ?? []) {
      addCandidate(chineseIndex.get(normalizeChineseCompoundTerm(alias)));
    }

    if (candidateIndexes.size > 1) {
      throw new Error(
        `Conflicting curated mapping for "${definition.labelZh}" / "${definition.englishName}": matched entries ${[...candidateIndexes].join(", ")}.`,
      );
    }

    const [matchedIndex] = candidateIndexes;
    if (matchedIndex === undefined) {
      if (supplementalCid === undefined) {
        throw new Error(
          `Curated entry "${definition.labelZh}" / "${definition.englishName}" is absent from the CSV and has no reviewed PubChem CID.`,
        );
      }
      const newEntry: ChineseCompoundEntry = {
        ...definition,
        cid: supplementalCid,
        source: "curated-extension",
        aliases: definition.aliases ? [...definition.aliases] : undefined,
      };
      const newIndex = entries.push(newEntry) - 1;
      indexEntry(newEntry, newIndex);
      continue;
    }

    const current = entries[matchedIndex];
    if (supplementalCid !== undefined && current.cid !== supplementalCid) {
      throw new Error(
        `Curated PubChem CID conflict for "${definition.labelZh}": CSV CID ${current.cid}, reviewed CID ${supplementalCid}.`,
      );
    }
    const aliases = Array.from(
      new Set([
        definition.labelZh,
        ...(current.aliases ?? []),
        ...(definition.aliases ?? []),
      ]),
    ).filter(
      (alias) =>
        normalizeChineseCompoundTerm(alias) !==
        normalizeChineseCompoundTerm(current.labelZh),
    );
    const mergedEntry: ChineseCompoundEntry = {
      ...current,
      category: definition.category ?? current.category,
      aliases: aliases.length > 0 ? aliases : undefined,
    };
    entries[matchedIndex] = mergedEntry;
    indexEntry(mergedEntry, matchedIndex);
  }

  return entries;
}

export const CHINESE_COMPOUND_ENTRIES: readonly ChineseCompoundEntry[] =
  buildChineseCompoundRegistry(
    GENERATED_CHINESE_COMPOUND_ENTRIES,
    CURATED_COMPOUND_DEFINITIONS,
  );

function normalizeChineseCompoundTerm(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[αΑ]/gu, "alpha")
    .replace(/[βΒ]/gu, "beta")
    .replace(/[\s\u3000]+/gu, "")
    .replace(/[‐‑‒–—―﹣－-]+/gu, "")
    .trim();
}

type IndexedChineseCompound = {
  entry: ChineseCompoundEntry;
  index: number;
  terms: string[];
};

const INDEXED_ENTRIES: IndexedChineseCompound[] = CHINESE_COMPOUND_ENTRIES.map(
  (entry, index) => ({
    entry,
    index,
    terms: Array.from(
      new Set(
        [entry.labelZh, ...(entry.aliases ?? [])]
          .map(normalizeChineseCompoundTerm)
          .filter(Boolean),
      ),
    ),
  }),
);

const EXACT_ENTRY_INDEX = new Map<string, ChineseCompoundEntry>();

for (const indexed of INDEXED_ENTRIES) {
  for (const term of indexed.terms) {
    const existing = EXACT_ENTRY_INDEX.get(term);
    if (existing && existing.cid !== indexed.entry.cid) {
      throw new Error(
        `Conflicting Chinese compound exact term "${term}" maps to PubChem CIDs ${existing.cid} and ${indexed.entry.cid}.`,
      );
    }
    EXACT_ENTRY_INDEX.set(term, indexed.entry);
  }
}

/**
 * Resolve only a curated, normalization-equivalent name. It intentionally does
 * not use edit distance, token inference or broad family matching.
 */
export function resolveChineseCompoundName(
  input: string,
): ChineseCompoundEntry | undefined {
  const normalized = normalizeChineseCompoundTerm(input);
  if (!normalized) return undefined;
  return EXACT_ENTRY_INDEX.get(normalized);
}

/**
 * Return deterministic suggestions: exact aliases first, then prefix matches,
 * then substring matches. Each chemical entity appears at most once.
 */
export function findChineseCompoundSuggestions(
  input: string,
  limit = 8,
): ChineseCompoundEntry[] {
  const normalized = normalizeChineseCompoundTerm(input);
  const safeLimit = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : 8;
  if (!normalized || safeLimit === 0) return [];

  return INDEXED_ENTRIES.map((indexed) => {
    let rank = Number.POSITIVE_INFINITY;
    if (indexed.terms.some((term) => term === normalized)) rank = 0;
    else if (indexed.terms.some((term) => term.startsWith(normalized))) rank = 1;
    else if (indexed.terms.some((term) => term.includes(normalized))) rank = 2;
    return { ...indexed, rank };
  })
    .filter((indexed) => Number.isFinite(indexed.rank))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, safeLimit)
    .map((indexed) => indexed.entry);
}
