export const LOCAL_INGREDIENT_DATABASE_NAME =
  "中国日化前沿靶点与植物化学数据库";

export type LocalIngredientIdentity = {
  name: string;
  type: string;
  subtype: string;
  summary: string;
};

export type LocalIngredientSource = {
  name: typeof LOCAL_INGREDIENT_DATABASE_NAME;
  recordType: "原料知识条目";
};

export type LocalIngredientFactor = {
  name: string;
  details?: string;
};

export type LocalIngredientComponent = {
  name: string;
  details?: string;
};

export type LocalIngredientComposition = {
  label: string;
  value: string;
  basis?: string;
  boundary?: string;
};

export type LocalIngredientEffect = {
  name: string;
  details?: string;
};

export type LocalIngredientMechanismClue = {
  name: string;
  details: string;
  evidenceBoundary: string;
};

export type LocalIngredientLiterature = {
  status: "collected";
  message: string;
  records: readonly LocalIngredientLiteratureRecord[];
};

export type LocalIngredientLiteratureRecord = {
  title: string;
  journal: string;
  year: string;
  relationship: "原料/提取物研究" | "代表性成分研究" | "综述资料" | "资料汇总";
  effects: readonly string[];
  url?: string;
  doi?: string;
  pmid?: string;
  sourceNote?: string;
};

/**
 * One curated raw-material dossier. The shape mirrors the nine visible result
 * sections so consumers do not have to infer chemical-entity fields for plant
 * materials, fractions, proteins or peptides.
 */
export type LocalIngredientRecord = {
  slug: string;
  aliases: readonly string[];
  identity: LocalIngredientIdentity;
  source: LocalIngredientSource;
  functionalFactors: readonly LocalIngredientFactor[];
  representativeComponents: readonly LocalIngredientComponent[];
  composition: readonly LocalIngredientComposition[];
  researchEffects: readonly LocalIngredientEffect[];
  mechanismClues: readonly LocalIngredientMechanismClue[];
  literature: LocalIngredientLiterature;
  dataNotes: readonly string[];
};

const SOURCE: LocalIngredientSource = {
  name: LOCAL_INGREDIENT_DATABASE_NAME,
  recordType: "原料知识条目",
};

const LITERATURE = {
  schisandra: {
    status: "collected",
    message: "已完整收录当前资料汇总中的五味子文献条目。",
    records: [
      {
        title: "A comprehensive review of Schisandra chinensis lignans: pharmacokinetics, pharmacological mechanisms, and future prospects in disease prevention and treatment",
        journal: "Chin Med.",
        year: "2025",
        relationship: "综述资料",
        effects: ["抗氧化", "抗炎", "神经保护", "保肝", "抗菌/抗病毒", "抗糖尿病", "抗癌"],
        pmid: "40205412",
        doi: "10.1186/s13020-025-01096-z",
        url: "https://pubmed.ncbi.nlm.nih.gov/40205412/",
      },
      { title: "Comprehensive review of dibenzocyclooctadiene lignans from the Schisandra genus: anticancer potential, mechanistic insights and future prospects in oncology", journal: "Chin Med.", year: "2024", relationship: "综述资料", effects: ["抗癌", "保肝", "抗病毒", "抗氧化", "抗炎"] },
      { title: "Current knowledge of Schisandra chinensis (Turcz.) Baill. (Chinese magnolia vine) as a medicinal plant species: a review on the bioactive components, pharmacological properties, analytical and biotechnological studies", journal: "Phytochem Rev.", year: "2017", relationship: "综述资料", effects: ["保肝", "抗炎", "抗氧化", "解毒"] },
      { title: "Pharmacodynamic effects and molecular mechanisms of lignans from Schisandra chinensis Turcz. (Baill.), a current review", journal: "Eur J Pharmacol.", year: "2021", relationship: "综述资料", effects: ["抗氧化", "抗炎", "神经保护", "抗癌"] },
      {
        title: "Antioxidant Effects of Schisandra chinensis Fruits and Their Active Constituents",
        journal: "Antioxidants (Basel)",
        year: "2021",
        relationship: "代表性成分研究",
        effects: ["抗氧化", "抗炎", "抗病毒", "抗癌", "抗衰老"],
        doi: "10.3390/antiox10040620",
        url: "https://doi.org/10.3390/antiox10040620",
      },
      { title: "Potential of Schisandra chinensis (Turcz.) Baill. in Human Health and Nutrition: A Review of Current Knowledge and Therapeutic Perspectives", journal: "Nutrients", year: "2019", relationship: "综述资料", effects: ["抗癌", "神经保护", "保肝", "抗炎", "抗氧化", "免疫刺激", "抗病毒"], sourceNote: "PMCID: PMC6412213" },
      { title: "Schisandra chinensis: A comprehensive review on its phytochemicals and biological activities", journal: "Arab J Chem.", year: "2021", relationship: "综述资料", effects: ["抗癌", "抗氧化", "神经保护", "保肝", "抗炎"] },
      { title: "A Review of the Biological Activity and Structure–Property Relationships of the Main Compounds from Schisandra chinensis", journal: "Molecules", year: "2025 (approx)", relationship: "综述资料", effects: ["抗氧化", "抗肿瘤", "抗病毒", "保肝", "改善认知"], sourceNote: "PMCID: PMC11821066" },
      { title: "A comprehensive review of ethnopharmacology, phytochemistry, pharmacology, and pharmacokinetics of Schisandra chinensis (Turcz.) Baill. and Schisandra sphenanthera Rehd. et Wils.", journal: "J Ethnopharmacol.", year: "2022", relationship: "综述资料", effects: ["保肝", "神经保护", "心脏保护", "抗癌", "抗氧化", "抗炎", "降血糖"] },
      { title: "Lignans are the main active components of Schisandrae Chinensis Fructus for liver disease treatment: a review", journal: "Food Sci Hum Wellness", year: "2024", relationship: "综述资料", effects: ["抗炎", "抗纤维化", "抗氧化", "抗肿瘤", "调节胆汁酸代谢", "保肝"] },
    ],
  },
  smilax: {
    status: "collected",
    message: "已完整收录当前资料汇总中的菝葜文献条目。",
    records: [
      { title: "Smilax china L.: A review of its botany, ethnopharmacology, phytochemistry, pharmacological activities, actual and potential applications", journal: "J Ethnopharmacol.", year: "2024", relationship: "综述资料", effects: ["抗炎", "抗癌", "抗氧化", "抗糖尿病", "抗肥胖", "抗高尿酸", "抗高血压", "皮肤伤口和屏障修复", "抗菌"], pmid: "37541403", doi: "10.1016/j.jep.2023.116992", url: "https://pubmed.ncbi.nlm.nih.gov/37541403/" },
      { title: "Steroidal saponins from Smilax china and their anti-inflammatory activities", journal: "Phytochemistry", year: "2007", relationship: "代表性成分研究", effects: ["抗炎", "抑制COX-2", "抑制TNF-α"] },
      { title: "Potential anti-glioma targets and mechanisms of Smilax china L. based on network pharmacological, molecular docking and experimental verification", journal: "Naunyn Schmiedebergs Arch Pharmacol.", year: "2026", relationship: "原料/提取物研究", effects: ["抗肿瘤", "抗胶质瘤"] },
      {
        title: "Smilax china L. Rhizome extract enhances anti-tumor immune responses by resetting M2-like macrophages and tumor-associated macrophages to M1-like via ERK1/2 signaling",
        journal: "J Ethnopharmacol.",
        year: "2025",
        relationship: "原料/提取物研究",
        effects: ["抗肿瘤", "免疫调节"],
        pmid: "40383248",
        doi: "10.1016/j.jep.2025.119983",
        url: "https://pubmed.ncbi.nlm.nih.gov/40383248/",
      },
      { title: "Steroidal Saponins from the Genus Smilax and Their Biological Activities", journal: "Nat Prod Bioprospect.", year: "2017", relationship: "综述资料", effects: ["抗真菌", "细胞毒", "抗肿瘤", "抗炎"] },
      {
        title: "Steroidal Saponins from the Rhizomes of Smilax china and Their Inhibitory Effects on Lipopolysaccharide-Induced Proinflammatory Cytokines Expression",
        journal: "Planta Medica",
        year: "2023",
        relationship: "代表性成分研究",
        effects: ["抗炎"],
        pmid: "36170856",
        doi: "10.1055/a-1896-1098",
        url: "https://pubmed.ncbi.nlm.nih.gov/36170856/",
      },
      { title: "Smilax china leaf extracts suppress pro-inflammatory adhesion response in human umbilical vein endothelial cells and proliferation of HeLa cells", journal: "Arch Physiol Biochem.", year: "2020", relationship: "原料/提取物研究", effects: ["抗炎", "抗癌"] },
      { title: "The genus Smilax L.: A comprehensive review of traditional uses, phytochemistry, pharmacological activities, and toxicity", journal: "S Afr J Bot.", year: "2026 (approx)", relationship: "综述资料", effects: ["抗癌", "抗糖尿病", "抗炎", "抗菌", "抗氧化", "抗病毒", "免疫调节", "保肝"] },
      { title: "Advances in the chemical constituents, pharmacological activity, and clinical application of Smilacis Glabrae Rhizoma... (related Smilax)", journal: "Heliyon", year: "2024", relationship: "综述资料", effects: ["抗肿瘤", "抗炎", "抗氧化"] },
      { title: "Anti-leukemic activity related root extract studies (Smilax china L. root extract)", journal: "BioResources", year: "2026", relationship: "原料/提取物研究", effects: ["抗白血病", "抗肿瘤", "抗炎"] },
    ],
  },
  morinda: {
    status: "collected",
    message: "已完整收录当前资料汇总中的巴戟天文献条目。",
    records: [
      { title: "Research progress on the oligosaccharide components and pharmacological activities of Morinda officinalis", journal: "Front Chem.", year: "2026", relationship: "综述资料", effects: ["抗抑郁", "抗阿尔茨海默", "抗骨质疏松", "抗氧化", "促血管生成"] },
      { title: "Iridoids with anti-inflammatory effect from the aerial parts of Morinda officinalis How", journal: "Fitoterapia", year: "2021", relationship: "代表性成分研究", effects: ["抗炎"] },
      { title: "Unveiling the Osteoprotective Potential of Morinda officinalis: A Scoping Review of Current Evidence", journal: "Nat Prod Commun.", year: "2026", relationship: "综述资料", effects: ["抗骨质疏松", "促进骨形成", "抑制骨吸收"] },
      { title: "Morinda officinalis How. – A comprehensive review of traditional uses, phytochemistry and pharmacology", journal: "J Ethnopharmacol.", year: "2018", relationship: "综述资料", effects: ["抗抑郁", "抗骨质疏松", "促生育", "抗辐射", "抗阿尔茨海默", "抗风湿", "抗疲劳", "抗衰老", "心血管保护", "抗氧化", "免疫调节", "抗炎"] },
      {
        title: "Structural characterization of Morinda officinalis How polysaccharide and its anti-osteoporotic effects via oxidative stress modulation",
        journal: "International Journal of Biological Macromolecules",
        year: "2025",
        relationship: "原料/提取物研究",
        effects: ["抗骨质疏松", "氧化应激调节"],
        pmid: "40582669",
        doi: "10.1016/j.ijbiomac.2025.145616",
        url: "https://pubmed.ncbi.nlm.nih.gov/40582669/",
      },
      { title: "Identification and characterization of a polysaccharide from the roots of Morinda officinalis, as an inducer of bone formation by up-regulation of target gene expression", journal: "Int J Biol Macromol.", year: "2019", relationship: "原料/提取物研究", effects: ["抗骨质疏松", "诱导骨形成"] },
      {
        title: "Isolation, phytochemistry, characterization, biological activity, and application of Morinda officinalis How oligosaccharide: a review",
        journal: "Journal of Pharmacy and Pharmacology",
        year: "2024",
        relationship: "综述资料",
        effects: ["抗骨质疏松", "抗抑郁"],
        pmid: "37991722",
        doi: "10.1093/jpp/rgad096",
        url: "https://pubmed.ncbi.nlm.nih.gov/37991722/",
      },
      { title: "Morinda Officinalis Polysaccharides Inhibit Osteoclast Differentiation by Regulating miR-214-3p/NEDD4L in Postmenopausal Osteoporosis Mice", journal: "Calcif Tissue Int.", year: "2024", relationship: "原料/提取物研究", effects: ["抗骨质疏松", "抑制破骨细胞分化"] },
      { title: "其他相关研究：低聚果糖与环烯醚萜苷的抗骨质疏松、抗炎与抗氧化研究", journal: "资料汇总", year: "—", relationship: "资料汇总", effects: ["抗骨质疏松", "抗炎", "抗氧化"], sourceNote: "当前资料将相关研究合并列示。" },
    ],
  },
  chrysophanol: {
    status: "collected",
    message: "已完整收录当前资料汇总中的大黄酚苷相关文献条目。",
    records: [
      {
        title: "Anti-Inflammatory Activity of Chrysophanol through the Suppression of NF-kB/Caspase-1 Activation in Vitro and in Vivo",
        journal: "Molecules",
        year: "2010",
        relationship: "代表性成分研究",
        effects: ["抗炎", "肠道炎症相关改善"],
        doi: "10.3390/molecules15096436",
        url: "https://doi.org/10.3390/molecules15096436",
      },
      {
        title: "Chrysophanol Attenuates Manifestations of Immune Bowel Diseases by Regulation of Colorectal Cells and T Cells Activation In Vivo",
        journal: "Molecules",
        year: "2021",
        relationship: "代表性成分研究",
        effects: ["抗炎", "肠屏障相关改善"],
        doi: "10.3390/molecules26061682",
        url: "https://doi.org/10.3390/molecules26061682",
      },
      {
        title: "Chrysophanol-8-O-glucoside protects mice against acute liver injury by inhibiting autophagy in hepatic stellate cells and inflammatory response in liver-resident macrophages",
        journal: "Frontiers in Pharmacology",
        year: "2022",
        relationship: "代表性成分研究",
        effects: ["抗炎", "抗氧化", "肝保护"],
        doi: "10.3389/fphar.2022.951521",
        url: "https://doi.org/10.3389/fphar.2022.951521",
      },
      { title: "Chrysophanol: A Natural Anthraquinone with Multifaceted Biotherapeutic Potential", journal: "Biomolecules", year: "2019", relationship: "综述资料", effects: ["抗癌", "保肝", "神经保护", "抗炎", "抗溃疡", "抗菌"] },
      { title: "相关研究：chrysophanol及其苷类的肠道屏障、抗炎、抗氧化、抗菌与抗肿瘤研究", journal: "资料汇总", year: "—", relationship: "资料汇总", effects: ["肠道屏障相关改善", "抗炎", "抗氧化", "抗菌", "抗肿瘤"], sourceNote: "当前资料将相关研究合并列示。" },
    ],
  },
  platycladus: {
    status: "collected",
    message: "已完整收录当前资料汇总中的侧柏黄酮相关文献条目。",
    records: [
      {
        title: "Antioxidant Properties of Platycladus orientalis Flavonoids for Treating UV-Induced Damage in Androgenetic Alopecia Hair",
        journal: "Molecules",
        year: "2024",
        relationship: "原料/提取物研究",
        effects: ["抗氧化", "毛发保护"],
        pmid: "38930941",
        doi: "10.3390/molecules29122876",
        url: "https://pubmed.ncbi.nlm.nih.gov/38930941/",
      },
      { title: "(7E)-7,8-Dehydroheliobuphthalmin from Platycladus orientalis L.: Isolation, Characterization, and Hair Growth Promotion", journal: "Int J Mol Sci.", year: "2025", relationship: "代表性成分研究", effects: ["促进毛发生长"] },
      { title: "Evaluation of Cacumen Platycladi Extract for Hair Loss Prevention: Mechanisms, Efficacy, and Clinical Application", journal: "Cosmetics", year: "2026", relationship: "原料/提取物研究", effects: ["防脱发", "抗氧化", "促进VEGF/COL17表达"] },
      { title: "Compound Platycladus orientalis tincture promotes hair regrowth and is associated with hair-cycle progression and Wnt/β-catenin-related signaling", journal: "J Ethnopharmacol.", year: "2026", relationship: "原料/提取物研究", effects: ["促进毛发再生", "调节毛囊周期"] },
      { title: "A comprehensive review of mechanistic insights into Platycladus orientalis (L.) Franco: integration of phytochemistry and pharmacology", journal: "Phytochem Rev.", year: "2026", relationship: "综述资料", effects: ["抗炎", "抗糖尿病", "抗氧化", "抗血管生成", "神经保护", "促进毛发生长"] },
      { title: "相关研究：侧柏提取物与黄酮组分的抗氧化、毛发保护及毛囊相关研究", journal: "资料汇总", year: "—", relationship: "资料汇总", effects: ["抗氧化", "毛发保护", "毛囊相关改善"], sourceNote: "当前资料将相关研究合并列示。" },
    ],
  },
  hemp: {
    status: "collected",
    message: "已完整收录当前资料汇总中的火麻仁蛋白文献条目。",
    records: [
      {
        title: "Hemp seed protein exerts its hypoglycemic and hypolipidemic effects through degradation into short peptides",
        journal: "Food Chemistry",
        year: "2025",
        relationship: "原料/提取物研究",
        effects: ["调节血脂", "改善糖代谢", "减轻肝脂肪变性"],
        doi: "10.1016/j.foodchem.2025.144406",
        url: "https://doi.org/10.1016/j.foodchem.2025.144406",
      },
      { title: "Hempseed (Cannabis sativa) protein hydrolysates: A valuable source of bioactive peptides with pleiotropic health-promoting effects", journal: "Trends Food Sci Technol.", year: "2022", relationship: "综述资料", effects: ["抗氧化", "免疫调节", "降压", "降血糖", "降脂"] },
      {
        title: "Hempseed Peptides Exert Hypocholesterolemic Effects with a Statin-Like Mechanism",
        journal: "Journal of Agricultural and Food Chemistry",
        year: "2017",
        relationship: "代表性成分研究",
        effects: ["降低胆固醇", "脂质代谢调节"],
        doi: "10.1021/acs.jafc.7b02742",
        url: "https://doi.org/10.1021/acs.jafc.7b02742",
      },
      {
        title: "Active peptides with hypoglycemic effect obtained from hemp (Cannabis sativa L.) protein through identification, molecular docking, and virtual screening",
        journal: "Food Chemistry",
        year: "2023",
        relationship: "代表性成分研究",
        effects: ["改善糖代谢"],
        doi: "10.1016/j.foodchem.2023.136912",
        url: "https://doi.org/10.1016/j.foodchem.2023.136912",
      },
      { title: "Hemp Seed Protein-Derived Lipase Inhibitory Peptides Attenuate High-Fat Diet-Induced Obesity...", journal: "Foods", year: "2026", relationship: "代表性成分研究", effects: ["抑制体重与脂肪积累", "降脂", "改善高血糖", "抗炎", "抑制胰脂肪酶"] },
      { title: "Computational Screening for the Dipeptidyl Peptidase-IV Inhibitory Peptides from Putative Hemp Seed Hydrolyzed Peptidome as a Potential Antidiabetic Agent", journal: "Int J Mol Sci.", year: "2024", relationship: "代表性成分研究", effects: ["潜在抗糖尿病", "DPP-IV抑制"] },
      { title: "相关研究：火麻仁蛋白及其酶解肽的代谢调节、消化酶抑制与体重管理研究", journal: "资料汇总", year: "—", relationship: "资料汇总", effects: ["降血糖", "降血脂", "消化酶抑制", "体重管理"], sourceNote: "当前资料将相关研究合并列示。" },
    ],
  },
} as const satisfies Record<string, LocalIngredientLiterature>;

const NO_SPECIFIC_TARGET: LocalIngredientMechanismClue = {
  name: "具体分子靶点",
  details: "现有资料未提供具体分子靶点或明确通路信息。",
  evidenceBoundary: "不将功效描述推断为已验证靶点。",
};

export const LOCAL_INGREDIENTS: readonly LocalIngredientRecord[] = [
  {
    slug: "schisandra",
    aliases: ["五味子", "五味子木脂素"],
    identity: {
      name: "五味子",
      type: "天然产物原料",
      subtype: "植物原料·木脂素类",
      summary: "以木脂素为主要功能因子的植物原料条目。",
    },
    source: SOURCE,
    functionalFactors: [{ name: "木脂素" }],
    representativeComponents: [
      { name: "五味子醇甲" },
      { name: "五味子醇乙", details: "又名戈米辛A" },
      { name: "去氧五味子素" },
      { name: "戈米辛H" },
      { name: "五味子乙素" },
    ],
    composition: [
      {
        label: "木脂素总含量",
        value: "67.73–87.61 mg/g",
        boundary: "资料未提供样品批次、检测方法或具体分子的分项含量。",
      },
    ],
    researchEffects: [
      { name: "抗炎" },
      { name: "保肝护肝" },
      { name: "抗癌" },
      { name: "抗肿瘤" },
      { name: "抗氧化" },
      { name: "抗心血管疾病" },
      { name: "改善认知功能" },
    ],
    mechanismClues: [NO_SPECIFIC_TARGET],
    literature: LITERATURE.schisandra,
    dataNotes: [
      "“抗癌”与“抗肿瘤”保留为资料中的并列功效表述，二者可能存在语义重叠。",
      "现有资料未给出研究模型、剂量、终点及文献对应关系。",
    ],
  },
  {
    slug: "smilax-china",
    aliases: ["菝葜", "菝蠜", "菝葜甾体皂苷", "菝蠜甾体皂苷"],
    identity: {
      name: "菝葜",
      type: "天然产物原料",
      subtype: "植物原料·甾体皂苷类",
      summary: "含多种骨架类型甾体皂苷及其苷元的植物原料条目。",
    },
    source: SOURCE,
    functionalFactors: [
      {
        name: "菝葜甾体皂苷",
        details:
          "包括拉肖皂苷元型、薯蓣皂苷元型、萨洒/替告皂苷元型、3,27-二羟基呋甾烷型、27-羟基-6-酮螺甾烷型和3,6,27-三羟基呋甾烷型。",
      },
    ],
    representativeComponents: [
      { name: "拉肖皂苷元" },
      { name: "菝葜皂苷A" },
      { name: "菝葜皂苷B" },
      { name: "菝葜皂苷C" },
      { name: "西博尔德苷A" },
      { name: "西博尔德苷B" },
      { name: "西博尔德苷元" },
    ],
    composition: [
      {
        label: "拉肖皂苷元含量",
        value: "0.059%",
        basis: "干物质质量分数",
        boundary: "该数值仅对应拉肖皂苷元，不等同于甾体皂苷总含量。",
      },
    ],
    researchEffects: [
      { name: "抗肿瘤" },
      { name: "抗关节炎" },
      { name: "治疗腰痛" },
      { name: "治疗麻风病" },
      { name: "治疗银屑病" },
      { name: "抗氧化" },
    ],
    mechanismClues: [NO_SPECIFIC_TARGET],
    literature: LITERATURE.smilax,
    dataNotes: [
      "“治疗”类用语为资料中的原始功效表述，现有资料未提供证据等级或临床适用边界。",
      "现有资料未给出总甾体皂苷含量。",
    ],
  },
  {
    slug: "morinda-officinalis",
    aliases: ["巴戟天", "巴戟天原料"],
    identity: {
      name: "巴戟天",
      type: "天然产物原料",
      subtype: "植物原料·复合成分",
      summary: "以低聚果糖、环烯醚萜苷和蒽醌苷等为主的植物原料条目。",
    },
    source: SOURCE,
    functionalFactors: [
      { name: "低聚果糖", details: "GF2–GF21" },
      { name: "环烯醚萜苷" },
      { name: "蒽醌苷" },
      {
        name: "加工相关成分",
        details: "加工后生成或增加的二果糖酐及环烯醚萜苷衍生物。",
      },
    ],
    representativeComponents: [
      { name: "水晶兰苷" },
      { name: "去乙酰车叶草苷酸" },
      { name: "栀子苷" },
      { name: "1,3-二羟基-2-甲基蒽醌-3-O-β-D-呋喃果糖苷" },
      { name: "二果糖酐" },
      { name: "环烯醚萜苷衍生物" },
    ],
    composition: [
      {
        label: "成分范围",
        value: "低聚果糖GF2–GF21、环烯醚萜苷、蒽醌苷及加工相关成分",
        boundary: "现有资料未提供总含量或各成分的定量数据。",
      },
    ],
    researchEffects: [
      { name: "抗炎" },
      { name: "抗氧化" },
      { name: "抗骨质疏松" },
      { name: "调节肠道菌群" },
      { name: "增强免疫" },
      { name: "保肝护肝" },
      { name: "抗肿瘤" },
      { name: "抗心血管疾病" },
      { name: "镇痛" },
      { name: "抗凋亡" },
      { name: "抗真菌" },
      { name: "改善脂质代谢" },
      { name: "促进钙吸收" },
      { name: "抗抑郁" },
    ],
    mechanismClues: [
      {
        name: "肠道菌群调节",
        details: "资料将肠道菌群调节列为研究功效和可关注的机制方向。",
        evidenceBoundary: "该表述不等同于具体分子靶点。",
      },
      {
        name: "钙吸收",
        details: "资料提及促进钙吸收，可作为机制方向线索。",
        evidenceBoundary: "现有资料未给出所涉转运体、信号通路或具体分子靶点。",
      },
      NO_SPECIFIC_TARGET,
    ],
    literature: LITERATURE.morinda,
    dataNotes: [
      "现有资料同时涉及原始成分和加工后生成或增加的成分，展示时应保留层级区分。",
      "现有资料未提供成分含量、研究模型或功效证据层级。",
    ],
  },
  {
    slug: "chrysophanol-glycoside",
    aliases: ["大黄酚苷", "大黃酚苷"],
    identity: {
      name: "大黄酚苷",
      type: "天然产物成分",
      subtype: "蒽醌苷类化合物",
      summary: "以大黄酚-1-O-葡萄糖苷为代表成分的蒽醌苷类条目。",
    },
    source: SOURCE,
    functionalFactors: [{ name: "蒽醌苷类化合物" }],
    representativeComponents: [{ name: "大黄酚-1-O-葡萄糖苷" }],
    composition: [
      {
        label: "高纯度对照品",
        value: ">98%或99.41%",
        basis: "对照品纯度",
        boundary: "该数值为对照品纯度，不得解读为原料中大黄酚苷的含量。",
      },
    ],
    researchEffects: [
      { name: "修复肠黏膜屏障" },
      { name: "溃疡性结肠炎相关改善" },
      { name: "抗炎" },
      { name: "抗氧化与菌群调节" },
      { name: "抗菌与抗真菌" },
      { name: "抗肿瘤" },
    ],
    mechanismClues: [
      {
        name: "肠黏膜屏障与免疫功能",
        details: "资料描述其可恢复免疫细胞功能、促进IL-22并增强肠屏障。",
        evidenceBoundary: "IL-22为机制线索，现有资料未证明其为该成分的直接结合靶点。",
      },
      {
        name: "未命名关键通路",
        details: "资料提及阻断一条关键通路，但未提供通路名称。",
        evidenceBoundary: "不根据功效表述补全通路或分子靶点。",
      },
      {
        name: "抗氧化与菌群调节",
        details: "资料将抗氧化与菌群调节作为可关注的机制方向。",
        evidenceBoundary: "现有资料未提供具体菌群、通路或分子靶点。",
      },
    ],
    literature: LITERATURE.chrysophanol,
    dataNotes: [
      "该条目在原料、提取物或单体层级上的规格边界尚不完整，展示时不扩展其化学实体范围。",
      "功效与机制表述未附研究模型、剂量、终点或文献对应关系。",
    ],
  },
  {
    slug: "platycladus-flavonoids",
    aliases: ["侧柏黄酮", "側柏黃酮"],
    identity: {
      name: "侧柏黄酮",
      type: "天然产物成分组",
      subtype: "黄酮类组分/提取物",
      summary: "以多种单黄酮和双黄酮为代表成分的植物化学成分组条目。",
    },
    source: SOURCE,
    functionalFactors: [{ name: "黄酮类" }],
    representativeComponents: [
      { name: "杨梅素" },
      { name: "槲皮素" },
      { name: "阿福豆苷" },
      { name: "花旗松素" },
      { name: "扁柏双黄酮" },
      { name: "穗花杉双黄酮" },
      { name: "山柰酚" },
      { name: "芦丁" },
    ],
    composition: [
      {
        label: "黄酮总相对含量",
        value: "24.27%",
        boundary: "现有资料未提供该比例的分母、样品规格或检测方法。",
      },
    ],
    researchEffects: [
      { name: "抗氧化与自由基清除" },
      { name: "保护头发脂质" },
      { name: "减少头发蛋白质流失" },
      { name: "抑制氨基酸光降解" },
      { name: "保护黑色素并延缓褪色" },
      { name: "改善头发机械性能" },
      { name: "修复毛小皮损伤" },
      { name: "促进角质形成细胞增殖" },
    ],
    mechanismClues: [
      {
        name: "氧化应激线索",
        details: "资料提及清除羟自由基和细胞内活性氧。",
        evidenceBoundary: "该类功能终点不等同于具体分子靶点。",
      },
      {
        name: "黑色素半里醌自由基",
        details: "资料提及抑制黑色素半里醌自由基。",
        evidenceBoundary: "现有资料未提供具体通路或直接结合靶点。",
      },
      NO_SPECIFIC_TARGET,
    ],
    literature: LITERATURE.platycladus,
    dataNotes: [
      "现有资料未明确成分组的提取工艺、规格及定量口径。",
      "头发与细胞相关功效来自不同类型终点，展示时不推定为临床功效。",
    ],
  },
  {
    slug: "hemp-seed-protein",
    aliases: ["火麻仁蛋白", "火麻仁蛋白质"],
    identity: {
      name: "火麻仁蛋白",
      type: "天然产物原料",
      subtype: "蛋白原料·酶解肽",
      summary: "以富含精氨酸的蛋白及其酶解肽为主的原料条目。",
    },
    source: SOURCE,
    functionalFactors: [
      { name: "火麻仁蛋白", details: "富含精氨酸" },
      { name: "酶解肽" },
    ],
    representativeComponents: [
      { name: "FLLWETYR", details: "核心肽" },
      { name: "FFFYLLDR", details: "核心肽" },
      { name: "DNNYAWWR", details: "核心肽" },
      { name: "精氨酸" },
    ],
    composition: [
      {
        label: "火麻仁原料粗蛋白",
        value: "20–25%",
        basis: "原料层级",
      },
      {
        label: "火麻仁蛋白原料纯度",
        value: ">90%",
        basis: "蛋白原料层级",
      },
      {
        label: "实验用蛋白纯度",
        value: ">90%",
        basis: "实验样品层级",
      },
      {
        label: "胰蛋白酶水解物",
        value: "5230条肽，其中4928条为唯一肽",
        basis: "酶解物层级",
        boundary: "肽长主要为7–20个氨基酸。",
      },
    ],
    researchEffects: [
      {
        name: "调节血脂",
        details: "TC、TG、LDL-C下降，HDL-C升高。",
      },
      {
        name: "改善糖代谢",
        details: "涉及OGTT和胰岛素抵抗相关指标。",
      },
      { name: "抑制体重与脂肪增加" },
      { name: "减轻肝脂肪变性" },
      { name: "体外抑制消化酶" },
    ],
    mechanismClues: [
      {
        name: "α-淀粉酶",
        details: "资料提及对α-淀粉酶的体外抑制作用。",
        evidenceBoundary: "体外酶抑制结果不等同于已验证临床靶点。",
      },
      {
        name: "胰脂肪酶",
        details: "资料提及对胰脂肪酶的体外抑制作用。",
        evidenceBoundary: "体外酶抑制结果不等同于已验证临床靶点。",
      },
      {
        name: "AMPK",
        details: "资料提及激活AMPK磷酸化。",
        evidenceBoundary: "为机制线索，现有资料未提供直接结合证据或临床靶点验证。",
      },
      {
        name: "HMGCR",
        details: "资料提及抑制HMGCR。",
        evidenceBoundary: "为机制线索，现有资料未提供直接结合证据或临床靶点验证。",
      },
      {
        name: "AKT1",
        details: "资料提及激活AKT1磷酸化。",
        evidenceBoundary: "为机制线索，现有资料未提供直接结合证据或临床靶点验证。",
      },
    ],
    literature: LITERATURE.hemp,
    dataNotes: [
      "原料粗蛋白、蛋白原料纯度、实验用蛋白纯度与酶解肽组分属于不同材料层级，不宜合并为单一含量指标。",
      "功效与机制线索未附具体研究模型、剂量、统计结果或文献对应关系。",
    ],
  },
] as const;

/**
 * Normalization is deliberately conservative: it handles Unicode width,
 * letter case, whitespace and separator variants, but does not stem, tokenize,
 * translate or apply edit distance.
 */
export function normalizeLocalIngredientTerm(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s\u3000]+/gu, "")
    .replace(/[·•・‧／/\\_|]+/gu, "")
    .replace(/[‐‑‒–—―﹣－-]+/gu, "")
    .trim();
}

type IndexedLocalIngredient = {
  record: LocalIngredientRecord;
  index: number;
  terms: readonly string[];
};

const INDEXED_LOCAL_INGREDIENTS: readonly IndexedLocalIngredient[] =
  LOCAL_INGREDIENTS.map((record, index) => ({
    record,
    index,
    terms: Array.from(
      new Set(record.aliases.map(normalizeLocalIngredientTerm).filter(Boolean)),
    ),
  }));

const EXACT_LOCAL_INGREDIENT_INDEX = new Map<string, LocalIngredientRecord>();
const SLUG_LOCAL_INGREDIENT_INDEX = new Map<string, LocalIngredientRecord>();

for (const indexed of INDEXED_LOCAL_INGREDIENTS) {
  if (SLUG_LOCAL_INGREDIENT_INDEX.has(indexed.record.slug)) {
    throw new Error(`Duplicate ingredient slug: ${indexed.record.slug}`);
  }
  SLUG_LOCAL_INGREDIENT_INDEX.set(indexed.record.slug, indexed.record);

  for (const term of indexed.terms) {
    const existing = EXACT_LOCAL_INGREDIENT_INDEX.get(term);
    if (existing && existing.slug !== indexed.record.slug) {
      throw new Error(
        `Conflicting ingredient alias "${term}" maps to ${existing.slug} and ${indexed.record.slug}.`,
      );
    }
    EXACT_LOCAL_INGREDIENT_INDEX.set(term, indexed.record);
  }
}

/**
 * Resolve only an exact, normalization-equivalent reviewed alias. Partial
 * names, family terms and typo correction are intentionally not accepted.
 */
export function resolveLocalIngredient(
  input: string,
): LocalIngredientRecord | undefined {
  const normalized = normalizeLocalIngredientTerm(input);
  if (!normalized) return undefined;
  return EXACT_LOCAL_INGREDIENT_INDEX.get(normalized);
}

export function getLocalIngredientBySlug(
  slug: string,
): LocalIngredientRecord | undefined {
  return SLUG_LOCAL_INGREDIENT_INDEX.get(slug.trim().toLocaleLowerCase("en-US"));
}

/**
 * Suggestions may use prefix/substring ranking for discovery; selecting a
 * suggestion still submits its reviewed full name to the exact resolver.
 */
export function findLocalIngredientSuggestions(
  input: string,
  limit = 6,
): LocalIngredientRecord[] {
  const normalized = normalizeLocalIngredientTerm(input);
  const safeLimit = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : 6;
  if (!normalized || safeLimit === 0) return [];

  return INDEXED_LOCAL_INGREDIENTS.map((indexed) => {
    let rank = Number.POSITIVE_INFINITY;
    if (indexed.terms.some((term) => term === normalized)) rank = 0;
    else if (indexed.terms.some((term) => term.startsWith(normalized))) rank = 1;
    else if (indexed.terms.some((term) => term.includes(normalized))) rank = 2;
    return { ...indexed, rank };
  })
    .filter((indexed) => Number.isFinite(indexed.rank))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, safeLimit)
    .map((indexed) => indexed.record);
}
