import type { EvidenceClaim, PublicationRecord } from "./types";

export interface PublicationEffectExtractionOptions {
  /** Maximum number of claims returned across all publications. */
  maxClaims?: number;
  /** Maximum number of distinct efficacy labels returned for one publication. */
  maxClaimsPerPublication?: number;
}

interface AliasMatcher {
  alias: string;
  pattern: RegExp;
}

interface LocatedMatch {
  index: number;
  end: number;
  value: string;
}

interface SentenceCandidate {
  text: string;
  locator: string;
  fromTitle: boolean;
}

interface EndpointRule {
  pattern: RegExp;
  label: string;
}

interface EffectRule {
  label: string;
  pattern: RegExp;
  endpoints: EndpointRule[];
}

const DEFAULT_MAX_CLAIMS = 50;
const DEFAULT_MAX_CLAIMS_PER_PUBLICATION = 3;
const MAX_RELATION_DISTANCE = 180;

const NON_PRIMARY_PUBLICATION_TYPES = new Set([
  "review",
  "systematic review",
  "meta-analysis",
  "preprint",
  "editorial",
  "comment",
  "published erratum",
  "corrected and republished article",
  "retracted publication",
  "retraction of publication",
]);

const NON_EFFICACY_TITLE = /\b(?:bibliometric|review|meta-analysis|erratum|corrigendum|correction|retraction|determination|quantification|isolation|purification|synthesis|biosynthesis|biotransformation|pharmacokinetic|bioavailability|metabolite profiling|structural elucidation|chromatograph(?:y|ic)|mass spectrometr(?:y|ic)|hplc|uplc|lc-ms)\b/iu;

// These titles describe a delivery system, material, or combination arm. Even
// when the compound appears in the same result clause, the observed phenotype
// cannot be conservatively attributed to the free monomer.
const FORMULATION_OR_COMBINATION_TITLE = /\b(?:liposomes?|nanoparticles?|scaffolds?|nanocomposites?|nanocarriers?|nanofibers?|nanoformulations?|micelles?|hydrogels?|microemulsions?|microspheres?|drug[- ]delivery|delivery systems?|electrospun|loaded|modified|integrated|encapsulated|conjugated|functionalized|coated|combined|combination|co[- ]administered|coadministration|co[- ]treatment|plus)\b/iu;
const SYNERGY_OR_OTHER_DRUG_TITLE = new RegExp(
  [
    "\\bsynerg(?:y|istic(?:ally)?|i[sz](?:e[sd]?|ing))\\b",
    // Conservative drug-name heuristic for titles such as "enhances
    // ranibizumab efficacy" and "improves atezolizumab ... therapy". The
    // suffix requirement avoids rejecting direct monomer statements such as
    // "enhances wound healing".
    "\\b(?:enhanc(?:e[sd]?|ing)|improv(?:e[sd]?|ing))\\b.{0,80}\\b[\\p{L}\\p{N}-]*(?:mab|nib|parib|ciclib|statin|taxel|platin|mycin|cycline|azole|vir|caine)\\b.{0,60}\\b(?:efficacy|therapy|treatment|immunotherapy|chemotherapy)\\b",
  ].join("|"),
  "iu",
);
const PUBMED_ID = /^\d{5,9}$/u;

const HEDGED_OR_CANDIDATE = /\b(?:may|might|could|possibly|potential(?:ly)?|candidate|promising agent|warrants? further|future studies)\b|可能|潜在|候选/iu;
const AIM_OR_HYPOTHESIS = /\b(?:aim(?:ed|s)?|objective|purpose|hypothes(?:is|ized)|investigat(?:e|ed|es|ing)|evaluat(?:e|ed|es|ing)|examin(?:e|ed|es|ing)|assess(?:ed|es|ing)|designed)\b.{0,100}\b(?:whether|effect|effects|efficacy|potential|role)\b|旨在|目的(?:是|为)|探讨|考察/iu;
const SECONDARY_ATTRIBUTION = /\b(?:has|have) been (?:reported|shown|suggested|considered|known)|\bprevious(?:ly)? (?:reported|shown|published|described)|\b(?:(?:previous|earlier|prior|modern pharmacological) studies|studies (?:has|have) (?:reported|shown|demonstrated|suggested|described))|\bit is (?:well )?known\b|已有研究(?:表明|报道)|既往研究/iu;
const NEGATED_RESULT = /\b(?:did not|does not|do not|failed to|fails to|no significant(?:ly)?|without (?:significantly )?(?:reducing|decreasing|improving|inhibiting|suppressing|enhancing|increasing))\b|未显著|无显著|未能/iu;
const NON_EXPERIMENTAL_SENTENCE = /^\s*(?:background|objective|purpose|methods?|introduction)\s*:/iu;

const ENGLISH_RESULT_VERB_SOURCE = [
  "reduc(?:e[sd]?|ing)",
  "decreas(?:e[sd]?|ing)",
  "lower(?:ed|s|ing)?",
  "inhibit(?:ed|s|ing)?",
  "suppress(?:ed|es|ing)?",
  "attenuat(?:e[sd]?|ing)",
  "alleviat(?:e[sd]?|ing)",
  "ameliorat(?:e[sd]?|ing)",
  "improv(?:e[sd]?|ing)",
  "protect(?:ed|s|ing)?",
  "prevent(?:ed|s|ing)?",
  "revers(?:e[sd]?|ing)",
  "restor(?:e[sd]?|ing)",
  "enhanc(?:e[sd]?|ing)",
  "increas(?:e[sd]?|ing)",
  "promot(?:e[sd]?|ing)",
  "activat(?:e[sd]?|ing)",
  "abolish(?:ed|es|ing)?",
  "block(?:ed|s|ing)?",
  "exert(?:ed|s|ing)?",
  "demonstrat(?:e[sd]?|ing)",
  "result(?:ed|s|ing)? in",
  "(?:led|leads|leading) to",
  "was effective (?:in|against)",
  "were effective (?:in|against)",
].join("|");

const CHINESE_RESULT_VERB_SOURCE = [
  "显著(?:降低|减少|抑制|改善|缓解|减轻|促进|增强|保护|逆转|恢复|阻断)",
  "(?:降低|减少|抑制|改善|缓解|减轻|促进|增强|保护|逆转|恢复|阻断)(?:了)?",
].join("|");

// English word boundaries prevent adjectives such as "neuroprotective" from
// being mistaken for the experimental verb "protect". Chinese verbs remain
// unbounded because they are normally adjacent to their subject and endpoint.
const RESULT_VERB_PATTERN = new RegExp(
  `\\b(?:${ENGLISH_RESULT_VERB_SOURCE})\\b|(?:${CHINESE_RESULT_VERB_SOURCE})`,
  "giu",
);
const DECREASE_PATTERN = /\b(?:reduc|decreas|lower|inhibit|suppress|attenuat|abolish|block)/iu;
const INCREASE_PATTERN = /\b(?:enhanc|increas|promot|activat|upregulat|induc|trigger)/iu;
const IMPROVEMENT_PATTERN = /\b(?:improv|ameliorat|alleviat|mitigat|restor|rescu|protect|prevent|revers|overcom|modulat)/iu;

const EFFECT_RULES: EffectRule[] = [
  {
    label: "炎症免疫",
    pattern: /\b(?:anti-inflammatory|inflamm(?:ation|atory)|proinflammatory|cytokines?|tnf(?:[- ]?(?:alpha|α))?|il[- ]?1(?:beta|β)|il[- ]?6|nf[- ]?(?:kappa|κ)b)\b|炎症|炎性因子|细胞因子/iu,
    endpoints: [
      { pattern: /\binflamm(?:ation|atory)\b|炎症/iu, label: "炎症反应" },
      { pattern: /\btnf(?:[- ]?(?:alpha|α))?\b/iu, label: "TNF-α" },
      { pattern: /\bil[- ]?1(?:beta|β)\b/iu, label: "IL-1β" },
      { pattern: /\bil[- ]?6\b/iu, label: "IL-6" },
      { pattern: /\bnf[- ]?(?:kappa|κ)b\b/iu, label: "NF-κB" },
    ],
  },
  {
    label: "氧化应激",
    pattern: /\b(?:anti-?oxid(?:ant|ative)|oxidative stress|reactive oxygen species|ros|malondialdehyde|mda|superoxide dismutase|sod|glutathione)\b|氧化应激|活性氧|抗氧化/iu,
    endpoints: [
      { pattern: /\boxidative stress\b|氧化应激/iu, label: "氧化应激" },
      { pattern: /\b(?:reactive oxygen species|ros)\b|活性氧/iu, label: "ROS" },
      { pattern: /\b(?:malondialdehyde|mda)\b/iu, label: "MDA" },
      { pattern: /\b(?:superoxide dismutase|sod)\b/iu, label: "SOD" },
      { pattern: /\bglutathione\b/iu, label: "谷胱甘肽" },
    ],
  },
  {
    label: "神经认知",
    pattern: /\b(?:neuroprotect(?:ion|ive)?|neuronal?|cogniti(?:on|ve)|memory|learning|brain injury|cerebral isch(?:emia|aemic)|stroke|alzheimer(?:'s)?|parkinson(?:'s)?|dementia)\b|神经保护|认知|记忆|脑损伤|脑缺血/iu,
    endpoints: [
      { pattern: /\b(?:cogniti(?:on|ve)|memory|learning)\b|认知|记忆/iu, label: "学习记忆/认知" },
      { pattern: /\bneuronal?\b|神经元/iu, label: "神经元相关指标" },
      { pattern: /\b(?:brain injury|cerebral isch(?:emia|aemic)|stroke)\b|脑损伤|脑缺血/iu, label: "神经损伤表型" },
    ],
  },
  {
    label: "睡眠与节律",
    pattern: /\b(?:sleep disturbances?|sleep quality|sleep duration|sleep deprivation|insomnia)\b|睡眠障碍|睡眠质量|睡眠时长|失眠/iu,
    endpoints: [
      { pattern: /\b(?:sleep disturbances?|sleep deprivation)\b|睡眠障碍/iu, label: "睡眠障碍" },
      { pattern: /\bsleep quality\b|睡眠质量/iu, label: "睡眠质量" },
      { pattern: /\bsleep duration\b|睡眠时长/iu, label: "睡眠时长" },
      { pattern: /\binsomnia\b|失眠/iu, label: "失眠相关表型" },
    ],
  },
  {
    label: "心脑血管",
    pattern: /\b(?:cardioprotect(?:ion|ive)?|myocardial|cardiac|cardiomyocyte|heart failure|atheroscleros(?:is|tic)|vascular|endothelial|blood pressure|hypertension)\b|心肌|心脏|心血管|动脉粥样硬化|内皮/iu,
    endpoints: [
      { pattern: /\b(?:myocardial|cardiac|cardiomyocyte|heart failure)\b|心肌|心脏/iu, label: "心肌/心功能" },
      { pattern: /\b(?:vascular|endothelial)\b|血管|内皮/iu, label: "血管内皮功能" },
      { pattern: /\b(?:blood pressure|hypertension)\b|血压|高血压/iu, label: "血压" },
    ],
  },
  {
    label: "糖脂代谢",
    pattern: /\b(?:glucose|glycemi[ac]|insulin|diabet(?:es|ic)|hyperglycemi[ac]|glucolipid|metabolic disorders?|energy homeostasis|lipid metabolism|cholesterol|triglycerides?|obesity|adipocyte|hepatic steatosis)\b|血糖|胰岛素|糖尿病|糖脂代谢|代谢紊乱|能量稳态|脂质代谢|胆固醇|甘油三酯|肥胖/iu,
    endpoints: [
      { pattern: /\b(?:glucose|glycemi[ac]|hyperglycemi[ac])\b|血糖/iu, label: "血糖" },
      { pattern: /\binsulin\b|胰岛素/iu, label: "胰岛素敏感性" },
      { pattern: /\b(?:cholesterol|triglycerides?|lipid metabolism)\b|胆固醇|甘油三酯|脂质代谢/iu, label: "脂质代谢" },
      { pattern: /\b(?:glucolipid|metabolic disorders?|energy homeostasis)\b|糖脂代谢|代谢紊乱|能量稳态/iu, label: "代谢稳态" },
      { pattern: /\bobesity\b|肥胖/iu, label: "肥胖相关表型" },
    ],
  },
  {
    label: "肿瘤生物学",
    pattern: /\b(?:anti-?cancer|anti-?tumou?r|tumou?r|cancer|carcinoma|leukemia|melanoma|glioma|sarcoma|neoplasm)\b|抗肿瘤|肿瘤|癌细胞/iu,
    endpoints: [
      { pattern: /\b(?:tumou?r growth|tumou?r volume)\b|肿瘤生长|肿瘤体积/iu, label: "肿瘤生长" },
      { pattern: /\bproliferation\b|增殖/iu, label: "细胞增殖" },
      { pattern: /\bapoptosis\b|凋亡/iu, label: "细胞凋亡" },
      { pattern: /\b(?:invasion|metastasis)\b|侵袭|转移/iu, label: "侵袭/转移" },
    ],
  },
  {
    label: "炎症免疫",
    pattern: /\b(?:immunomodulat(?:ion|ory)|immune response|immunity|immunosuppress(?:ion|ive)|t[- ]cells?|b[- ]cells?|natural killer cells?|dendritic cells?)\b|免疫调节|免疫反应|免疫功能/iu,
    endpoints: [
      { pattern: /\b(?:immune response|immunity)\b|免疫反应|免疫功能/iu, label: "免疫反应" },
      { pattern: /\bt[- ]cells?\b|T细胞/iu, label: "T细胞" },
      { pattern: /\bb[- ]cells?\b|B细胞/iu, label: "B细胞" },
      { pattern: /\bnatural killer cells?\b|自然杀伤细胞/iu, label: "NK细胞" },
    ],
  },
  {
    label: "皮肤与屏障",
    pattern: /\b(?:skin|cutaneous|dermal|keratinocyte|wound healing|photoag(?:e|ing)|melanogenesis|melanin|atopic dermatitis)\b|皮肤|角质形成细胞|创面愈合|光老化|黑色素/iu,
    endpoints: [
      { pattern: /\b(?:wound healing|wound closure)\b|创面愈合/iu, label: "创面愈合" },
      { pattern: /\bcollagen\b|胶原/iu, label: "胶原相关指标" },
      { pattern: /\b(?:melanogenesis|melanin)\b|黑色素/iu, label: "黑色素生成" },
      { pattern: /\b(?:skin|cutaneous|dermal|keratinocyte|fibroblast)\b|皮肤|角质形成细胞|成纤维细胞/iu, label: "皮肤细胞/组织表型" },
    ],
  },
  {
    label: "肝脏研究",
    pattern: /\b(?:hepatoprotect(?:ion|ive)?|liver injury|hepatic injury|hepatocyte|hepatic fibrosis|liver fibrosis|cirrhosis)\b|肝保护|肝损伤|肝细胞|肝纤维化/iu,
    endpoints: [
      { pattern: /\b(?:liver injury|hepatic injury)\b|肝损伤/iu, label: "肝损伤表型" },
      { pattern: /\b(?:hepatic fibrosis|liver fibrosis|cirrhosis)\b|肝纤维化/iu, label: "肝纤维化" },
      { pattern: /\bhepatocyte\b|肝细胞/iu, label: "肝细胞相关指标" },
    ],
  },
  {
    label: "肾脏研究",
    pattern: /\b(?:renoprotect(?:ion|ive)?|kidney injury|renal injury|renal dysfunction|nephrotoxicity|nephropathy)\b|肾保护|肾损伤|肾功能/iu,
    endpoints: [
      { pattern: /\b(?:kidney injury|renal injury|nephrotoxicity)\b|肾损伤/iu, label: "肾损伤表型" },
      { pattern: /\b(?:renal dysfunction|nephropathy)\b|肾功能/iu, label: "肾功能" },
    ],
  },
  {
    label: "骨与组织修复",
    pattern: /\b(?:osteoporosis|osteoblast|osteoclast|bone loss|bone mineral density|bone formation)\b|骨质疏松|成骨细胞|破骨细胞|骨量|骨形成/iu,
    endpoints: [
      { pattern: /\bosteoblast\b|成骨细胞/iu, label: "成骨细胞" },
      { pattern: /\bosteoclast\b|破骨细胞/iu, label: "破骨细胞" },
      { pattern: /\b(?:bone loss|bone mineral density|bone formation)\b|骨量|骨形成/iu, label: "骨量/骨形成" },
    ],
  },
  {
    label: "感染与病原",
    pattern: /\b(?:antimicrobial|antibacterial|antiviral|antifungal|bacterial growth|viral replication|virus replication)\b|抗菌|抗病毒|抗真菌/iu,
    endpoints: [
      { pattern: /\b(?:antimicrobial|antibacterial|bacterial growth)\b|抗菌/iu, label: "细菌相关指标" },
      { pattern: /\b(?:antiviral|viral replication|virus replication)\b|抗病毒/iu, label: "病毒复制" },
      { pattern: /\b(?:antifungal|fungal growth)\b|抗真菌/iu, label: "真菌相关指标" },
    ],
  },
  {
    label: "胃肠道与屏障",
    pattern: /\b(?:gastric injury|intestinal injury|colitis|gut barrier|intestinal barrier|mucosal injury|gastric ulcer)\b|胃损伤|肠损伤|结肠炎|肠屏障|黏膜损伤|胃溃疡/iu,
    endpoints: [
      { pattern: /\b(?:gut barrier|intestinal barrier)\b|肠屏障/iu, label: "肠屏障功能" },
      { pattern: /\bcolitis\b|结肠炎/iu, label: "结肠炎表型" },
      { pattern: /\b(?:gastric injury|intestinal injury|mucosal injury|gastric ulcer)\b|胃损伤|肠损伤|黏膜损伤|胃溃疡/iu, label: "胃肠黏膜损伤" },
    ],
  },
  {
    label: "运动与疲劳",
    pattern: /\b(?:anti-?fatigue|fatigue|exercise endurance|swimming endurance|physical endurance)\b|抗疲劳|运动耐力|游泳耐力/iu,
    endpoints: [
      { pattern: /\b(?:fatigue|anti-?fatigue)\b|疲劳/iu, label: "疲劳相关指标" },
      { pattern: /\b(?:exercise endurance|swimming endurance|physical endurance)\b|运动耐力|游泳耐力/iu, label: "运动耐力" },
    ],
  },
  {
    label: "疼痛调节",
    pattern: /\b(?:analgesi[ac]|antinociceptive|nociception|neuropathic pain|inflammatory pain|pain behavior)\b|镇痛|疼痛行为/iu,
    endpoints: [
      { pattern: /\b(?:nociception|neuropathic pain|inflammatory pain|pain behavior)\b|疼痛行为/iu, label: "疼痛行为" },
    ],
  },
];

function clampLimit(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(0, Math.trunc(value as number)));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeAliasMatchers(aliases: string[]): AliasMatcher[] {
  const seen = new Set<string>();
  const matchers: AliasMatcher[] = [];

  for (const rawAlias of aliases) {
    const alias = normalizeWhitespace(rawAlias.normalize("NFKC"));
    const key = alias.toLocaleLowerCase();
    if (!alias || seen.has(key)) continue;
    seen.add(key);

    // Two-character abbreviations such as Re, F2, or CK are too ambiguous to
    // establish compound identity by themselves in biomedical abstracts.
    const compact = alias.replace(/[^\p{L}\p{N}]/gu, "");
    if (compact.length < 3) continue;

    const body = alias
      .split(/[\s\-‐‑‒–—]+/u)
      .map(escapeRegExp)
      .join("[\\s\\-‐‑‒–—]*");
    if (!body) continue;

    matchers.push({
      alias,
      pattern: new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "iu"),
    });
  }

  return matchers.sort((left, right) => right.alias.length - left.alias.length);
}

function sentenceCandidates(record: PublicationRecord): SentenceCandidate[] {
  const candidates: SentenceCandidate[] = [];
  const abstract = normalizeWhitespace(record.abstract ?? "");
  if (abstract) {
    const structured = abstract.replace(
      /\s+(?=(?:background|objective|purpose|methods?|results?|conclusions?)\s*:)/giu,
      "\n",
    );
    const sentences = structured
      .split(/\n+|(?<=[.!?。！？])\s+(?=[\p{L}\p{N}])/u)
      .map(normalizeWhitespace)
      .filter(Boolean);
    sentences.forEach((text, index) => {
      candidates.push({
        text,
        locator: `abstract sentence ${index + 1}`,
        fromTitle: false,
      });
    });
  }

  const title = normalizeWhitespace(record.title);
  if (title) candidates.push({ text: title, locator: "title", fromTitle: true });
  return candidates;
}

function locate(pattern: RegExp, text: string): LocatedMatch | undefined {
  const match = pattern.exec(text);
  if (!match || match.index === undefined) return undefined;
  return {
    index: match.index,
    end: match.index + match[0].length,
    value: match[0],
  };
}

function locateAll(pattern: RegExp, text: string): LocatedMatch[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  return Array.from(text.matchAll(globalPattern), (match) => ({
    index: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    value: match[0],
  }));
}

function hasUnsupportedFraming(sentence: string): boolean {
  return (
    HEDGED_OR_CANDIDATE.test(sentence) ||
    AIM_OR_HYPOTHESIS.test(sentence) ||
    SECONDARY_ATTRIBUTION.test(sentence) ||
    NEGATED_RESULT.test(sentence) ||
    NON_EXPERIMENTAL_SENTENCE.test(sentence)
  );
}

function relatedResultMatches(
  sentence: string,
  aliasMatch: LocatedMatch,
): LocatedMatch[] {
  return locateAll(RESULT_VERB_PATTERN, sentence).filter((result) => {
    const negativePrefix = sentence.slice(Math.max(0, result.index - 32), result.index);
    if (NEGATED_RESULT.test(negativePrefix)) return false;

    const bridge = aliasMatch.end <= result.index
      ? sentence.slice(aliasMatch.end, result.index)
      : sentence.slice(result.end, aliasMatch.index);
    if (/[:;：；]/u.test(bridge)) return false;

    if (aliasMatch.end <= result.index) {
      return result.index - aliasMatch.end <= MAX_RELATION_DISTANCE;
    }

    if (result.end <= aliasMatch.index) {
      const bridge = sentence.slice(result.end, aliasMatch.index);
      return (
        aliasMatch.index - result.end <= 100 &&
        /\b(?:by|after|following|with|through)\b|被|经/iu.test(bridge)
      );
    }

    return false;
  });
}

function inferDirection(resultText: string): EvidenceClaim["direction"] {
  if (DECREASE_PATTERN.test(resultText) || /降低|减少|抑制|缓解|减轻|阻断/iu.test(resultText)) {
    return "decrease";
  }
  if (INCREASE_PATTERN.test(resultText) || /促进|增强|升高|上调/iu.test(resultText)) {
    return "increase";
  }
  if (IMPROVEMENT_PATTERN.test(resultText) || /改善|恢复|保护|逆转|调节/iu.test(resultText)) {
    return "mixed";
  }
  return "unknown";
}

function inferModel(
  sentence: string,
  abstractText: string,
): Pick<EvidenceClaim, "modelType" | "species"> {
  const humanModel = /\b(?:patients?|participants?|subjects?|volunteers?|randomi[sz]ed (?:controlled )?trial|clinical trial)\b|患者|受试者|临床试验/iu;
  const mouseModel = /\b(?:mice|mouse|murine|c57bl\/?6|balb\/?c)\b|小鼠/iu;
  const dssModel = /\bdss[- ]induced colitis\b/iu;
  const ratModel = /\b(?:rats?|sprague[- ]dawley|wistar)\b|大鼠/iu;
  const zebrafishModel = /\b(?:zebrafish|danio rerio)\b|斑马鱼/iu;
  const rabbitModel = /\b(?:rabbits?|oryctolagus cuniculus)\b|兔/iu;
  const humanCellModel = /\b(?:hacat|huvec|hek[- ]?293|hela|siha|sh[- ]?sy5y|a549|hepg2|mcf[- ]?7|human (?:primary )?[a-z -]*cells?)\b/iu;
  const mouseCellModel = /\b(?:c2c12|raw ?264\.?7|bv-?2)\b/iu;
  const ratCellModel = /\bpc-?12\b/iu;
  const genericCellModel = /\b(?:cell lines?|cultured cells?|primary cells?|macrophages?|keratinocytes?|fibroblasts?|neurons?|cardiomyocytes?)\b|细胞|巨噬细胞|角质形成细胞|成纤维细胞|神经元/iu;

  const inspect = (text: string): Pick<EvidenceClaim, "modelType" | "species"> | undefined => {
    if (humanModel.test(text)) {
      return { modelType: "human", species: "Homo sapiens" };
    }
    if (mouseModel.test(text) || dssModel.test(text)) {
      return { modelType: "animal", species: "Mus musculus" };
    }
    if (ratModel.test(text)) {
      return { modelType: "animal", species: "Rattus norvegicus" };
    }
    if (zebrafishModel.test(text)) {
      return { modelType: "animal", species: "Danio rerio" };
    }
    if (rabbitModel.test(text)) {
      return { modelType: "animal", species: "Oryctolagus cuniculus" };
    }
    if (humanCellModel.test(text)) {
      return { modelType: "cell", species: "Homo sapiens" };
    }
    if (mouseCellModel.test(text)) {
      return { modelType: "cell", species: "Mus musculus" };
    }
    if (ratCellModel.test(text)) {
      return { modelType: "cell", species: "Rattus norvegicus" };
    }
    if (genericCellModel.test(text)) {
      return { modelType: "cell" };
    }
    return undefined;
  };

  // Prefer the model named in the exact evidence sentence. This keeps a
  // cell-specific result in a mixed animal/cell paper from being relabelled as
  // an animal claim, and prevents a background mention of patients elsewhere
  // in the abstract from turning a mouse result into a human claim.
  const sentenceModel = inspect(sentence);
  if (sentenceModel) return sentenceModel;

  const hasHuman = humanModel.test(abstractText);
  const hasAnimal = [mouseModel, dssModel, ratModel, zebrafishModel, rabbitModel]
    .some((pattern) => pattern.test(abstractText));
  const hasCell = [humanCellModel, mouseCellModel, ratCellModel, genericCellModel]
    .some((pattern) => pattern.test(abstractText));
  if ([hasHuman, hasAnimal, hasCell].filter(Boolean).length > 1) {
    return { modelType: "other" };
  }

  return inspect(abstractText) ?? { modelType: "other" };
}

function endpointsFor(rule: EffectRule, sentence: string): string[] {
  const endpoints = rule.endpoints
    .filter((endpoint) => endpoint.pattern.test(sentence))
    .map((endpoint) => endpoint.label);
  return Array.from(new Set(endpoints.length > 0 ? endpoints : [rule.label]));
}

function sourceId(record: PublicationRecord): string {
  return record.pmid ?? record.pmcid ?? record.doi ?? record.id;
}

function sourceUrl(record: PublicationRecord): string {
  return record.pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(record.pmid)}/`
    : record.sourceUrl;
}

function isPrimaryEfficacyCandidate(record: PublicationRecord): boolean {
  const pmid = record.pmid?.trim() ?? "";
  if (record.sourceDatabase.trim().toLocaleUpperCase() !== "MED" || !PUBMED_ID.test(pmid)) {
    return false;
  }
  const types = record.publicationTypes.map((type) => type.trim().toLocaleLowerCase());
  if (types.some((type) => NON_PRIMARY_PUBLICATION_TYPES.has(type))) return false;
  return (
    !NON_EFFICACY_TITLE.test(record.title) &&
    !FORMULATION_OR_COMBINATION_TITLE.test(record.title) &&
    !SYNERGY_OR_OTHER_DRUG_TITLE.test(record.title)
  );
}

/**
 * Deterministically extracts conservative efficacy claims from PubMed records
 * returned by Europe PMC.
 *
 * A claim is emitted only when one sentence contains all three elements:
 * an explicit compound alias, an experimental result verb related to that
 * alias, and a recognized efficacy outcome. Reviews, analytical/synthetic
 * papers, aims, hypotheses, secondary attributions, hedged candidates, and
 * negated/null results are excluded. The excerpt remains verbatim so callers
 * can always display the basis for the label.
 */
export function extractPublicationEffectClaims(
  records: PublicationRecord[],
  aliases: string[],
  options: PublicationEffectExtractionOptions = {},
): EvidenceClaim[] {
  const maxClaims = clampLimit(options.maxClaims, DEFAULT_MAX_CLAIMS, 1_000);
  const maxPerPublication = clampLimit(
    options.maxClaimsPerPublication,
    DEFAULT_MAX_CLAIMS_PER_PUBLICATION,
    20,
  );
  if (maxClaims === 0 || maxPerPublication === 0) return [];

  const aliasMatchers = makeAliasMatchers(aliases);
  if (aliasMatchers.length === 0) return [];

  const claims: EvidenceClaim[] = [];

  for (const record of records) {
    if (claims.length >= maxClaims) break;
    if (!record.title || !isPrimaryEfficacyCandidate(record)) continue;

    const abstractText = normalizeWhitespace(record.abstract ?? "");
    const emittedLabels = new Set<string>();

    for (const candidate of sentenceCandidates(record)) {
      if (claims.length >= maxClaims || emittedLabels.size >= maxPerPublication) break;
      if (candidate.text.length < 12 || hasUnsupportedFraming(candidate.text)) continue;

      let matchedAlias: AliasMatcher | undefined;
      let aliasLocation: LocatedMatch | undefined;
      let resultMatches: LocatedMatch[] = [];

      for (const alias of aliasMatchers) {
        const location = locate(alias.pattern, candidate.text);
        if (!location) continue;
        const related = relatedResultMatches(candidate.text, location);
        if (related.length === 0) continue;
        matchedAlias = alias;
        aliasLocation = location;
        resultMatches = related;
        break;
      }

      if (!matchedAlias || !aliasLocation || resultMatches.length === 0) continue;

      for (const rule of EFFECT_RULES) {
        if (claims.length >= maxClaims || emittedLabels.size >= maxPerPublication) break;
        if (emittedLabels.has(rule.label)) continue;
        const effectLocation = locate(rule.pattern, candidate.text);
        if (!effectLocation) continue;

        const relatedResult = resultMatches.find(
          (result) => {
            const close =
              Math.abs(effectLocation.index - result.index) <= MAX_RELATION_DISTANCE ||
              Math.abs(effectLocation.end - result.end) <= MAX_RELATION_DISTANCE;
            if (!close) return false;
            const bridge = candidate.text.slice(
              Math.min(effectLocation.end, result.end),
              Math.max(effectLocation.index, result.index),
            );
            // A colon or semicolon usually starts a separate title clause or
            // a separate result. Crossing it would turn nearby keywords into
            // unsupported efficacy attribution.
            return !/[:;：；]/u.test(bridge);
          },
        );
        if (!relatedResult) continue;

        const model = inferModel(candidate.text, abstractText);
        const confidence = Math.min(
          0.94,
          0.82 +
            (candidate.fromTitle ? 0.05 : 0) +
            (/\b(?:significantly|results? (?:showed|demonstrated|revealed|indicated))\b|显著/iu.test(candidate.text) ? 0.05 : 0) +
            (matchedAlias.alias.length >= 8 ? 0.02 : 0),
        );

        claims.push({
          claimType: "efficacy",
          summary: record.title,
          effect: rule.label,
          direction: inferDirection(relatedResult.value),
          evidenceLevel: "T4",
          modelType: model.modelType,
          species: model.species,
          intervention: matchedAlias.alias,
          endpoints: endpointsFor(rule, candidate.text),
          source: {
            source: "europe_pmc",
            sourceId: sourceId(record),
            sourceUrl: sourceUrl(record),
            locator: candidate.locator,
            excerpt: candidate.text.slice(0, 600),
          },
          confidence,
          reviewStatus: "machine_unreviewed",
          modelName: "pubmed_rule_v1",
        });
        emittedLabels.add(rule.label);
      }
    }
  }

  return claims;
}
