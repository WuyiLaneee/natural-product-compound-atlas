import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import ts from "typescript";

async function importStandaloneTypeScript(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourceUrl.pathname,
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
  );
}

async function importBundledTypeScript(relativePath) {
  const entryPoint = fileURLToPath(new URL(relativePath, import.meta.url));
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    write: false,
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
  );
}

const compoundApi = await importBundledTypeScript(
  "../lib/evidence/compound-api.ts",
);
const compoundAliases = await importStandaloneTypeScript(
  "../lib/evidence/compound-aliases.ts",
);
const pubchem = await importBundledTypeScript(
  "../lib/evidence/sources/pubchem.ts",
);

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function pubchemFetch({ cids = [2244], properties } = {}) {
  const calls = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/cids/JSON")) {
      return jsonResponse({ IdentifierList: { CID: cids } });
    }
    if (url.includes("/property/")) {
      return jsonResponse({
        PropertyTable: {
          Properties: properties ?? cids.map((cid) => ({
            CID: cid,
            Title: cid === 2244 ? "Aspirin" : `Candidate ${cid}`,
            MolecularFormula: "C9H8O4",
            MolecularWeight: "180.16",
            InChIKey: cid === 2244
              ? "BSYNRYMUTXBXSQ-UHFFFAOYSA-N"
              : `AAAAAAAAAAAAAA-BBBBBBBBBB-${cid % 10}`,
          })),
        },
      });
    }
    throw new Error(`Unexpected PubChem URL: ${url}`);
  };
  return { calls, fetchImpl };
}

test("CID policy accepts only canonical positive safe integers", () => {
  assert.equal(compoundApi.parsePubChemCid("2244"), 2244);
  assert.equal(compoundApi.parsePubChemCid("0"), null);
  assert.equal(compoundApi.parsePubChemCid("-1"), null);
  assert.equal(compoundApi.parsePubChemCid("1.5"), null);
  assert.equal(compoundApi.parsePubChemCid("9007199254740992"), null);
});

test("new cache and rate-limit namespaces cannot collide with the ginsenoside deployment", () => {
  assert.equal(
    compoundApi.compoundEvidenceCacheId(2244),
    "v1-any-pubchem-cid:cid:2244",
  );
  assert.match(compoundApi.COMPOUND_EVIDENCE_CACHE_SOURCE, /pubchem_compound/);
  assert.equal(compoundApi.COMPOUND_EVIDENCE_CACHE_TTL_MS, 6 * 60 * 60 * 1_000);
  assert.equal(compoundApi.requiresStructureConfirmation("name"), true);
  assert.equal(compoundApi.requiresStructureConfirmation("cid"), false);
  assert.equal(compoundApi.requiresStructureConfirmation("inchikey"), false);
});

test("search candidates retain PubChem identity and a CID-scoped structure image", () => {
  const candidate = compoundApi.toSearchCandidate({
    cid: 5234,
    title: "Sodium chloride",
    iupacName: "sodium chloride",
    molecularFormula: "ClNa",
    molecularWeight: 58.44,
    charge: 0,
    covalentUnitCount: 2,
    definedAtomStereoCount: 0,
    undefinedAtomStereoCount: 0,
    canonicalSmiles: "[Na+].[Cl-]",
    inchiKey: "FAPWRFPIFSIZLT-UHFFFAOYSA-M",
    pubchemUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/5234",
  });
  assert.equal(candidate.cid, 5234);
  assert.equal(candidate.iupacName, "sodium chloride");
  assert.equal(candidate.charge, 0);
  assert.equal(candidate.covalentUnitCount, 2);
  assert.match(candidate.entityNote, /2 个共价单元/);
  assert.match(candidate.structureUrl, /\/cid\/5234\/PNG/);
});

test("reviewed Chinese registry identities can provide a CID-scoped degraded candidate", () => {
  const candidate = compoundApi.chineseRegistryCandidate({
    labelZh: "人参皂苷 Rb3",
    englishName: "GINSENOSIDE RB3",
    cid: 12912363,
    source: "cosmetic-small-molecules-pubchem-csv",
  });
  assert.deepEqual(candidate, {
    cid: 12912363,
    title: "GINSENOSIDE RB3",
    pubchemUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/12912363",
  });
});

test("literature aliases are deterministic from the PubChem CID profile", () => {
  const profile = {
    cid: 969516,
    title: "Curcumin",
    pubchemUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/969516",
    synonyms: [
      "Curcumin",
      "Diferuloylmethane",
      "458-37-7",
      "VFLDPWHFBUODDF-FCXRPNKRSA-N",
      "C21H20O6",
      "CHEMBL53",
      "Natural Yellow 3",
    ],
    patentReferences: [],
    patentReferenceCount: 0,
  };
  assert.deepEqual(compoundAliases.selectScientificAliases(profile), [
    "Curcumin",
    "Diferuloylmethane",
    "Natural Yellow 3",
  ]);
});

test("short biochemical acronyms are not sent to literature or trial search", () => {
  const profile = {
    cid: 5957,
    title: "ATP",
    pubchemUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/5957",
    synonyms: ["ATP", "5'-Atp", "ace", "Urea", "Adenosine triphosphate", "Adenosine 5'-triphosphate", "C10H16N5O13P3"],
    patentReferences: [],
    patentReferenceCount: 0,
  };
  assert.deepEqual(compoundAliases.selectScientificAliases(profile), [
    "Adenosine triphosphate",
    "Adenosine 5'-triphosphate",
  ]);
});

test("PubChem resolution supports CID, full InChIKey, CAS/name and ambiguity", async () => {
  const cidRequest = pubchemFetch();
  const byCid = await pubchem.resolvePubChemCompound("2244", {
    fetchImpl: cidRequest.fetchImpl,
  });
  assert.equal(byCid.queryKind, "cid");
  assert.equal(byCid.status, "resolved");
  assert.equal(byCid.selected.cid, 2244);

  const keyRequest = pubchemFetch();
  const byKey = await pubchem.resolvePubChemCompound(
    "BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
    { fetchImpl: keyRequest.fetchImpl },
  );
  assert.equal(byKey.queryKind, "inchikey");
  assert.equal(byKey.status, "resolved");
  assert.match(keyRequest.calls[0], /\/inchikey\//);

  const casRequest = pubchemFetch();
  const byCas = await pubchem.resolvePubChemCompound("50-78-2", {
    fetchImpl: casRequest.fetchImpl,
  });
  assert.equal(byCas.queryKind, "name");
  assert.equal(byCas.status, "resolved");
  assert.equal(compoundApi.requiresStructureConfirmation(byCas.queryKind), true);
  assert.match(casRequest.calls[0], /\/name\/50-78-2\/cids\/JSON/);

  const ambiguousRequest = pubchemFetch({ cids: [111, 222] });
  const ambiguous = await pubchem.resolvePubChemCompound("vitamin E", {
    fetchImpl: ambiguousRequest.fetchImpl,
  });
  assert.equal(ambiguous.queryKind, "name");
  assert.equal(ambiguous.status, "ambiguous");
  assert.deepEqual(ambiguous.candidates.map((item) => item.cid), [111, 222]);
});

test("CID evidence route never reads q and uses the expanded refresh allowance", async () => {
  const route = await readFile(
    new URL("../app/api/compound/[cid]/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(route, /searchParams\.get\(["']q["']\)/);
  assert.match(route, /query:\s*String\(cid\)/);
  assert.match(route, /limit:\s*12/);
  assert.doesNotMatch(route, /getCatalogEntryByPubchemCid|首版仅支持目录内/);
});

test("upstream outages are distinct from a genuine PubChem not-found result", async () => {
  const searchRoute = await readFile(
    new URL("../app/api/search/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(searchRoute, /source\.status === "error"[\s\S]*status: "unavailable"/);
  assert.match(searchRoute, /resolution\.status === "not_found"[\s\S]*status: "not_found"/);
});
