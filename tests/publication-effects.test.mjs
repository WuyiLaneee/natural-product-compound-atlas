import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../lib/evidence/publication-effects.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "publication-effects.ts",
}).outputText;
const { extractPublicationEffectClaims } = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

function publication(overrides = {}) {
  return {
    id: "12345678",
    sourceDatabase: "MED",
    pmid: "12345678",
    title: "Experimental study of ginsenoside Rg1",
    authors: ["Example A"],
    publicationTypes: ["Journal Article"],
    keywords: [],
    meshTerms: [],
    isOpenAccess: true,
    fullTextStatus: "open_pdf",
    sourceUrl: "https://europepmc.org/article/MED/12345678",
    ...overrides,
  };
}

test("extracts an explicit result as a traceable efficacy claim", () => {
  const records = [
    publication({
      pmid: "12345678",
      abstract:
        "Male mice received the compound for seven days. Ginsenoside Rg1 significantly improved memory deficits and reduced neuronal injury in mice.",
    }),
  ];

  const claims = extractPublicationEffectClaims(records, ["Ginsenoside Rg1", "Rg1"]);

  assert.equal(claims.length, 1);
  assert.equal(claims[0].claimType, "efficacy");
  assert.equal(claims[0].effect, "神经认知");
  assert.equal(claims[0].summary, records[0].title);
  assert.equal(claims[0].direction, "mixed");
  assert.equal(claims[0].modelType, "animal");
  assert.equal(claims[0].species, "Mus musculus");
  assert.equal(claims[0].source.sourceId, "12345678");
  assert.equal(claims[0].source.sourceUrl, "https://pubmed.ncbi.nlm.nih.gov/12345678/");
  assert.equal(claims[0].source.locator, "abstract sentence 2");
  assert.match(claims[0].source.excerpt, /Rg1 significantly improved memory deficits/);
  assert.deepEqual(claims[0].endpoints, ["学习记忆/认知", "神经元相关指标"]);
  assert.equal(claims[0].modelName, "pubmed_rule_v1");
  assert.equal(claims[0].reviewStatus, "machine_unreviewed");
});

test("only accepts MED records with a 5-9 digit PMID and rejects preprints", () => {
  const positiveAbstract =
    "Ginsenoside Rg1 significantly improved memory deficits in mice.";
  const records = [
    publication({ pmid: "12345", abstract: positiveAbstract }),
    publication({ pmid: "123456789", abstract: positiveAbstract }),
    publication({ id: "missing-pmid", pmid: undefined, abstract: positiveAbstract }),
    publication({ id: "short-pmid", pmid: "1234", abstract: positiveAbstract }),
    publication({ id: "long-pmid", pmid: "1234567890", abstract: positiveAbstract }),
    publication({ sourceDatabase: "PAT", pmid: "22345678", abstract: positiveAbstract }),
    publication({ sourceDatabase: "AGR", pmid: "32345678", abstract: positiveAbstract }),
    publication({ sourceDatabase: "IND", pmid: "42345678", abstract: positiveAbstract }),
    publication({
      sourceDatabase: "MED",
      pmid: "52345678",
      publicationTypes: ["Preprint"],
      abstract: positiveAbstract,
    }),
  ];

  const claims = extractPublicationEffectClaims(
    records,
    ["Ginsenoside Rg1", "Rg1"],
  );

  assert.deepEqual(
    claims.map((claim) => claim.source.sourceId),
    ["12345", "123456789"],
  );
});

test("requires the compound alias and result wording in the same sentence", () => {
  const records = [
    publication({
      abstract:
        "Ginsenoside Rg1 was administered to rats. Neuroinflammation and memory deficits were significantly reduced after treatment.",
    }),
  ];

  assert.deepEqual(
    extractPublicationEffectClaims(records, ["Ginsenoside Rg1", "Rg1"]),
    [],
  );
});

test("filters reviews, aims, hedged candidates, secondary citations, and null results", () => {
  const records = [
    publication({
      id: "review",
      title: "Ginsenoside Rg1 and neuroprotection: a review",
      publicationTypes: ["Review"],
      abstract: "Ginsenoside Rg1 significantly reduced neuronal injury in mice.",
    }),
    publication({
      id: "aim",
      abstract: "We investigated whether ginsenoside Rg1 reduced inflammatory cytokines in macrophages.",
    }),
    publication({
      id: "hedged",
      abstract: "Ginsenoside Rg1 may reduce oxidative stress and could be a promising candidate.",
    }),
    publication({
      id: "secondary",
      abstract: "Ginsenoside Rg1 has been reported to suppress tumor growth in mice.",
    }),
    publication({
      id: "secondary-studies",
      abstract:
        "Modern pharmacological studies have demonstrated that Rg1 exhibits anti-inflammatory, antioxidant, and neuroprotective effects.",
    }),
    publication({
      id: "null",
      abstract: "Ginsenoside Rg1 did not significantly reduce inflammatory cytokines in rats.",
    }),
  ];

  assert.deepEqual(
    extractPublicationEffectClaims(records, ["Ginsenoside Rg1", "Rg1"]),
    [],
  );
});

test("does not mistake efficacy adjectives for experimental result verbs", () => {
  const record = publication({
    abstract:
      "Ginsenoside Rg1 is a neuroprotective natural product with anti-inflammatory properties.",
  });

  assert.deepEqual(
    extractPublicationEffectClaims([record], ["Ginsenoside Rg1", "Rg1"]),
    [],
  );
});

test("does not cross title clauses when assigning an efficacy label", () => {
  const record = publication({
    pmid: "44444444",
    title:
      "Ginsenoside Rg1 improves sleep disturbances in mice: involvement of inflammatory pathways",
    abstract: undefined,
  });

  const claims = extractPublicationEffectClaims(
    [record],
    ["Ginsenoside Rg1", "Rg1"],
  );
  assert.deepEqual(claims.map((claim) => claim.effect), ["睡眠与节律"]);
});

test("filters synthesis, analytical, pharmacokinetic, and correction records", () => {
  const records = [
    publication({
      id: "analysis",
      title: "HPLC determination of ginsenoside Rg1 in plasma",
      abstract: "Ginsenoside Rg1 improved chromatographic recovery and reduced analytical error.",
    }),
    publication({
      id: "pk",
      title: "Pharmacokinetics and bioavailability of ginsenoside Rg1",
      abstract: "Ginsenoside Rg1 increased plasma exposure in rats.",
    }),
    publication({
      id: "erratum",
      title: "Correction: ginsenoside Rg1 reduced inflammation",
      publicationTypes: ["Published Erratum"],
      abstract: "Ginsenoside Rg1 significantly reduced inflammation in mice.",
    }),
  ];

  assert.deepEqual(
    extractPublicationEffectClaims(records, ["Ginsenoside Rg1", "Rg1"]),
    [],
  );
});

test("does not attribute delivery-system or combination-title effects to the free monomer", () => {
  const records = [
    publication({
      pmid: "61000001",
      title: "Ginsenoside Rg1-loaded nanoparticles reduce tumor growth in mice",
      abstract: "Ginsenoside Rg1-loaded nanoparticles significantly reduced tumor growth in mice.",
    }),
    publication({
      pmid: "61000002",
      title: "Ginsenoside Rg1-modified liposomes suppress carcinoma progression",
      abstract: "Ginsenoside Rg1-modified liposomes significantly suppressed carcinoma progression in mice.",
    }),
    publication({
      pmid: "61000003",
      title: "An electrospun scaffold integrated with ginsenoside Rg1 improves wound healing",
      abstract: "The electrospun scaffold integrated with ginsenoside Rg1 significantly improved wound healing in mice.",
    }),
    publication({
      pmid: "61000004",
      title: "Ginsenoside Rg1 combined with metformin improves glucose control",
      abstract: "Ginsenoside Rg1 combined with metformin significantly improved glucose control in mice.",
    }),
    publication({
      pmid: "61000005",
      title: "Ginsenoside Rg1 plus sorafenib suppresses tumor growth",
      abstract: "Ginsenoside Rg1 plus sorafenib significantly suppressed tumor growth in mice.",
    }),
    publication({
      pmid: "61000006",
      title: "Ginsenoside Rg1 improves wound healing in mice",
      abstract: "Ginsenoside Rg1 significantly improved wound healing in mice.",
    }),
  ];

  const claims = extractPublicationEffectClaims(
    records,
    ["Ginsenoside Rg1", "Rg1"],
  );

  assert.deepEqual(
    claims.map((claim) => claim.source.sourceId),
    ["61000006"],
  );
});

test("filters synergistic and other-drug efficacy or therapy titles", () => {
  const records = [
    publication({
      pmid: "41830319",
      title:
        "Synergistic inhibition of macular vascular permeability in diabetic edema: Ginsenoside Rg3 enhances ranibizumab efficacy by targeting angiopoietin-like protein 4.",
      abstract:
        "Ginsenoside Rg3 significantly reduced vascular permeability and inflammation.",
    }),
    publication({
      pmid: "42102789",
      title:
        "Ginsenoside Rg3 improves atezolizumab immune checkpoint therapy in triple-negative breast cancer.",
      abstract:
        "Ginsenoside Rg3 significantly suppressed breast cancer growth in mice.",
    }),
    publication({
      pmid: "29156516",
      title:
        "Synergistic anticancer activity of 20(S)-Ginsenoside Rg3 and Sorafenib in hepatocellular carcinoma.",
      abstract:
        "20(S)-Ginsenoside Rg3 significantly suppressed carcinoma cell proliferation.",
    }),
    publication({
      pmid: "41866854",
      title:
        "Ginsenoside Rg3 suppresses breast cancer growth and synergizes with PD-1 immunotherapy.",
      abstract:
        "Ginsenoside Rg3 significantly suppressed breast cancer growth in mice.",
    }),
    publication({
      pmid: "63000001",
      title: "Ginsenoside Rg3 enhances ranibizumab efficacy in retinal disease",
      abstract:
        "Ginsenoside Rg3 significantly reduced vascular inflammation in mice.",
    }),
    publication({
      pmid: "63000002",
      title: "Ginsenoside Rg3 enhances wound healing in mice",
      abstract: "Ginsenoside Rg3 significantly enhanced wound healing in mice.",
    }),
  ];

  const claims = extractPublicationEffectClaims(
    records,
    ["20(S)-Ginsenoside Rg3", "Ginsenoside Rg3", "Rg3"],
  );

  assert.deepEqual(
    claims.map((claim) => claim.source.sourceId),
    ["63000002"],
  );
});

test("prefers the model in the exact evidence sentence", () => {
  const mixedAnimalCell = publication({
    pmid: "62000001",
    abstract:
      "C2C12 myotubes were cultured under high glucose conditions. Ginsenoside Rg1 significantly reduced oxidative stress in C2C12 cells. Parallel experiments were performed in mice.",
  });
  const mixedHumanAnimalCell = publication({
    pmid: "62000002",
    abstract:
      "Mice and HeLa cells were used for preclinical experiments. Patients were enrolled in a randomized controlled trial. Ginsenoside Rg1 significantly reduced inflammatory cytokines.",
  });
  const c2c12Only = publication({
    pmid: "62000003",
    abstract:
      "Ginsenoside Rg1 significantly reduced oxidative stress in C2C12 myotubes.",
  });
  const humanCellLines = publication({
    pmid: "62000004",
    abstract:
      "Ginsenoside Rg1 significantly reduced carcinoma cell proliferation in HeLa and SiHa cells.",
  });

  const [animalClaim] = extractPublicationEffectClaims(
    [mixedAnimalCell],
    ["Ginsenoside Rg1", "Rg1"],
  );
  assert.equal(animalClaim.modelType, "cell");
  assert.equal(animalClaim.species, "Mus musculus");

  const [humanClaim] = extractPublicationEffectClaims(
    [mixedHumanAnimalCell],
    ["Ginsenoside Rg1", "Rg1"],
  );
  assert.equal(humanClaim.modelType, "other");
  assert.equal(humanClaim.species, undefined);

  const [c2c12Claim] = extractPublicationEffectClaims(
    [c2c12Only],
    ["Ginsenoside Rg1", "Rg1"],
  );
  assert.equal(c2c12Claim.modelType, "cell");
  assert.equal(c2c12Claim.species, "Mus musculus");

  const [humanCellClaim] = extractPublicationEffectClaims(
    [humanCellLines],
    ["Ginsenoside Rg1", "Rg1"],
  );
  assert.equal(humanCellClaim.modelType, "cell");
  assert.equal(humanCellClaim.species, "Homo sapiens");
});

test("uses neutral research domains when an endpoint worsens", () => {
  const [claim] = extractPublicationEffectClaims(
    [publication({
      pmid: "63000001",
      abstract:
        "Ginsenoside Rg1 significantly increased inflammatory cytokines in mice.",
    })],
    ["Ginsenoside Rg1", "Rg1"],
  );

  assert.equal(claim.effect, "炎症免疫");
  assert.equal(claim.direction, "increase");
});

test("does not cross a semicolon to borrow another intervention's result", () => {
  const records = [publication({
    pmid: "63000002",
    abstract:
      "Ginsenoside Rg1 was quantified in plasma; metformin significantly reduced inflammatory cytokines in mice.",
  })];

  assert.deepEqual(
    extractPublicationEffectClaims(records, ["Ginsenoside Rg1", "Rg1"]),
    [],
  );
});

test("does not cross a colon to borrow another intervention's result", () => {
  const records = [publication({
    pmid: "63000005",
    abstract:
      "Ginsenoside Rg1 was quantified: metformin significantly reduced inflammatory cytokines in mice.",
  })];

  assert.deepEqual(
    extractPublicationEffectClaims(records, ["Ginsenoside Rg1", "Rg1"]),
    [],
  );
});

test("returns an unspecified model when full-abstract fallback conflicts", () => {
  const [claim] = extractPublicationEffectClaims(
    [publication({
      pmid: "63000006",
      abstract:
        "The disease affects many patients. Male mice were used for experiments. Ginsenoside Rg1 significantly reduced inflammatory cytokines.",
    })],
    ["Ginsenoside Rg1", "Rg1"],
  );

  assert.equal(claim.modelType, "other");
  assert.equal(claim.species, undefined);
});

test("does not classify non-dermal fibroblast studies as skin research", () => {
  const claims = extractPublicationEffectClaims(
    [publication({
      pmid: "63000003",
      abstract:
        "Ginsenoside Rg1 significantly suppressed lung cancer-associated fibroblast activation.",
    })],
    ["Ginsenoside Rg1", "Rg1"],
  );

  assert.deepEqual(claims.map((claim) => claim.effect), ["肿瘤生物学"]);
});

test("recognizes DSS-induced colitis as an animal model", () => {
  const [claim] = extractPublicationEffectClaims(
    [publication({
      pmid: "63000004",
      abstract:
        "Ginsenoside Rg1 significantly alleviated DSS-induced colitis by modulating macrophages.",
    })],
    ["Ginsenoside Rg1", "Rg1"],
  );

  assert.equal(claim.modelType, "animal");
  assert.equal(claim.species, "Mus musculus");
});

test("emits distinct labels deterministically and respects claim limits", () => {
  const records = [
    publication({
      pmid: "11111111",
      abstract:
        "In rats, ginsenoside Rg1 significantly reduced inflammatory cytokines and oxidative stress after injury.",
    }),
    publication({
      id: "22222222",
      pmid: "22222222",
      abstract:
        "Ginsenoside Rg1 significantly improved wound healing and increased collagen in human fibroblasts.",
    }),
  ];

  const claims = extractPublicationEffectClaims(records, ["Ginsenoside Rg1", "Rg1"], {
    maxClaims: 2,
  });

  assert.deepEqual(claims.map((claim) => claim.effect), ["炎症免疫", "氧化应激"]);
  assert.ok(claims.every((claim) => claim.source.sourceId === "11111111"));
});

test("rejects ambiguous two-character aliases but accepts a direct title assertion", () => {
  const ambiguous = publication({
    title: "CK suppresses tumor growth in mice",
    abstract: undefined,
  });
  assert.deepEqual(extractPublicationEffectClaims([ambiguous], ["CK"]), []);

  const direct = publication({
    id: "9852086",
    pmid: "33333333",
    title: "Ginsenoside compound K suppresses tumor growth in mice",
    abstract: undefined,
  });
  const claims = extractPublicationEffectClaims(
    [direct],
    ["Ginsenoside compound K", "Compound K", "CK"],
  );
  assert.equal(claims.length, 1);
  assert.equal(claims[0].effect, "肿瘤生物学");
  assert.equal(claims[0].source.locator, "title");
  assert.equal(claims[0].direction, "decrease");
});
