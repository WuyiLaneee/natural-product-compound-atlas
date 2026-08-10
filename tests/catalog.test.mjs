import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../lib/catalog.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "catalog.ts",
}).outputText;
const catalogModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

const {
  GINSENOSIDE_CATALOG,
  GINSENOSIDE_CATEGORIES,
  findCatalogMatches,
  getCatalogEntryByPubchemCid,
  getCatalogEntryBySlug,
  normalizeCompoundQuery,
} = catalogModule;

test("catalog contains every planned first-wave monomer", () => {
  assert.equal(GINSENOSIDE_CATALOG.length, 30);

  const requiredSlugs = [
    "ginsenoside-ra1",
    "ginsenoside-ra2",
    "ginsenoside-ra3",
    "ginsenoside-rb1",
    "ginsenoside-rb2",
    "ginsenoside-rb3",
    "ginsenoside-rc",
    "ginsenoside-rd",
    "ginsenoside-re",
    "ginsenoside-rf",
    "ginsenoside-rg1",
    "ginsenoside-rg2-20s",
    "ginsenoside-rg2-20r",
    "ginsenoside-rg3-20s",
    "ginsenoside-rg3-20r",
    "ginsenoside-rh1-20s",
    "ginsenoside-rh1-20r",
    "ginsenoside-rh2-20s",
    "ginsenoside-rh2-20r",
    "ginsenoside-f1",
    "ginsenoside-f2",
    "ginsenoside-compound-k",
    "ginsenoside-rk1",
    "ginsenoside-rk3",
    "ginsenoside-rg5",
    "ginsenoside-rg6",
    "ginsenoside-rh4",
    "ginsenoside-ro",
    "pseudoginsenoside-f11",
    "notoginsenoside-r1",
  ];

  assert.deepEqual(
    GINSENOSIDE_CATALOG.map((entry) => entry.slug),
    requiredSlugs,
  );
});

test("stable identity fields are unique and category values are supported", () => {
  const slugs = new Set();
  const cids = new Set();
  const inchiKeys = new Set();

  for (const entry of GINSENOSIDE_CATALOG) {
    assert.ok(!slugs.has(entry.slug), `duplicate slug: ${entry.slug}`);
    slugs.add(entry.slug);

    assert.ok(entry.displayNameZh.length > 0);
    assert.ok(entry.displayNameEn.length > 0);
    assert.ok(entry.aliases.length > 0);
    assert.ok(entry.category in GINSENOSIDE_CATEGORIES);

    if (entry.pubchemCid !== null) {
      assert.ok(!cids.has(entry.pubchemCid), `duplicate CID: ${entry.pubchemCid}`);
      cids.add(entry.pubchemCid);
    }

    if (entry.pubchemInchiKey !== null) {
      assert.match(entry.pubchemInchiKey, /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/);
      assert.ok(
        !inchiKeys.has(entry.pubchemInchiKey),
        `duplicate InChIKey: ${entry.pubchemInchiKey}`,
      );
      inchiKeys.add(entry.pubchemInchiKey);
    }
  }
});

test("verified PubChem CIDs resolve to the intended entries", () => {
  assert.equal(getCatalogEntryByPubchemCid(9898279)?.slug, "ginsenoside-rb1");
  assert.equal(getCatalogEntryByPubchemCid(9918693)?.slug, "ginsenoside-rg3-20s");
  assert.equal(getCatalogEntryByPubchemCid(46887680)?.slug, "ginsenoside-rg3-20r");
  assert.equal(getCatalogEntryByPubchemCid(9852086)?.slug, "ginsenoside-compound-k");
  assert.equal(getCatalogEntryByPubchemCid(441934)?.slug, "notoginsenoside-r1");
});

test("generic epimer queries return both candidates while explicit queries do not", () => {
  assert.deepEqual(
    findCatalogMatches("Rg3").map((entry) => entry.slug),
    ["ginsenoside-rg3-20s", "ginsenoside-rg3-20r"],
  );
  assert.deepEqual(
    findCatalogMatches("20(R)-Rg3").map((entry) => entry.slug),
    ["ginsenoside-rg3-20r"],
  );
  assert.equal(
    getCatalogEntryBySlug("ginsenoside-rg3-20s")
      ?.requiresStereoisomerDisambiguation,
    true,
  );
});

test("Chinese, English, CID, and InChIKey aliases are searchable", () => {
  assert.equal(findCatalogMatches("三七皂苷R1")[0]?.slug, "notoginsenoside-r1");
  assert.equal(findCatalogMatches("Compound K")[0]?.slug, "ginsenoside-compound-k");
  assert.equal(findCatalogMatches("9852086")[0]?.slug, "ginsenoside-compound-k");
  assert.equal(findCatalogMatches("39262-14-1")[0]?.slug, "ginsenoside-compound-k");
  assert.equal(
    findCatalogMatches("FVIZARNDLVOMSU-IRFFNABBSA-N")[0]?.slug,
    "ginsenoside-compound-k",
  );
  assert.equal(normalizeCompoundQuery("２０（Ｓ）‑Rg3"), "20srg3");
});

test("known PubChem stereochemistry caveats are explicit", () => {
  const ra3 = getCatalogEntryBySlug("ginsenoside-ra3");
  assert.equal(ra3?.pubchemCid, 73157064);
  assert.equal(
    ra3?.pubchemVerification,
    "verified-name-only-stereochemistry-incomplete",
  );
  assert.match(ra3?.pubchemNote ?? "", /34 undefined atom stereocenters/);

  const compoundK = getCatalogEntryBySlug("ginsenoside-compound-k");
  assert.equal(compoundK?.requiresStereoisomerDisambiguation, true);
  assert.match(compoundK?.pubchemNote ?? "", /20\(S\)/);
});
