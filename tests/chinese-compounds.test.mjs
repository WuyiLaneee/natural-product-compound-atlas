import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
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

const registry = await importStandaloneTypeScript(
  "../lib/evidence/chinese-compounds.ts",
);

test("registry contains a bounded, unique set of PubChem query names", () => {
  assert.ok(registry.CHINESE_COMPOUND_ENTRIES.length >= 50);
  assert.ok(registry.CHINESE_COMPOUND_ENTRIES.length <= 80);

  const labels = registry.CHINESE_COMPOUND_ENTRIES.map((entry) => entry.labelZh);
  const englishNames = registry.CHINESE_COMPOUND_ENTRIES.map(
    (entry) => entry.englishName.toLocaleLowerCase(),
  );
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(new Set(englishNames).size, englishNames.length);
  assert.ok(
    registry.CHINESE_COMPOUND_ENTRIES.every(
      (entry) => entry.labelZh && entry.englishName && entry.category,
    ),
  );
});

test("exact Chinese names resolve to PubChem-ready English names", () => {
  assert.equal(
    registry.resolveChineseCompoundName("姜黄素")?.englishName,
    "Curcumin",
  );
  assert.equal(
    registry.resolveChineseCompoundName("咖啡因")?.englishName,
    "Caffeine",
  );
  assert.equal(
    registry.resolveChineseCompoundName("人参皂苷 Rg1")?.englishName,
    "Ginsenoside Rg1",
  );
  assert.equal(
    registry.resolveChineseCompoundName("维生素 C")?.englishName,
    "Ascorbic acid",
  );
});

test("normalization supports full-width spaces, traditional aliases and alpha/beta spellings", () => {
  assert.equal(
    registry.resolveChineseCompoundName("　薑黃素　")?.englishName,
    "Curcumin",
  );
  assert.equal(
    registry.resolveChineseCompoundName("ＡＬＰＨＡ 熊果苷")?.englishName,
    "alpha-Arbutin",
  );
  assert.equal(
    registry.resolveChineseCompoundName("α-熊果苷")?.englishName,
    "alpha-Arbutin",
  );
  assert.equal(
    registry.resolveChineseCompoundName("ＢＥＴＡ－熊果苷")?.englishName,
    "beta-Arbutin",
  );
  assert.equal(
    registry.resolveChineseCompoundName("β 烟酰胺单核苷酸")?.englishName,
    "beta-Nicotinamide mononucleotide",
  );
});

test("resolver is exact and refuses partial or family-level inference", () => {
  assert.equal(registry.resolveChineseCompoundName("姜黄"), undefined);
  assert.equal(registry.resolveChineseCompoundName("黄酮"), undefined);
  assert.equal(registry.resolveChineseCompoundName("人参皂苷"), undefined);
  assert.equal(registry.resolveChineseCompoundName("咖啡"), undefined);
  assert.equal(registry.resolveChineseCompoundName(""), undefined);
});

test("suggestions rank exact before prefix before contains and deduplicate aliases", () => {
  const exact = registry.findChineseCompoundSuggestions("黄芩苷", 10);
  assert.equal(exact[0].englishName, "Baicalin");

  const ginsenosides = registry.findChineseCompoundSuggestions("人参皂苷", 10);
  assert.deepEqual(
    ginsenosides.map((entry) => entry.englishName),
    [
      "Ginsenoside Rg1",
      "Ginsenoside Rb1",
      "Ginsenoside Re",
      "Ginsenoside Compound K",
    ],
  );

  const arbutins = registry.findChineseCompoundSuggestions("熊果苷", 10);
  assert.deepEqual(
    arbutins.map((entry) => entry.englishName),
    ["alpha-Arbutin", "beta-Arbutin"],
  );
  assert.equal(new Set(arbutins.map((entry) => entry.englishName)).size, 2);
});

test("suggestion limit is safe and deterministic", () => {
  assert.deepEqual(registry.findChineseCompoundSuggestions("酸", 0), []);
  assert.equal(registry.findChineseCompoundSuggestions("酸", 3).length, 3);
  assert.deepEqual(registry.findChineseCompoundSuggestions("", 5), []);
  assert.deepEqual(registry.findChineseCompoundSuggestions("不存在的分子", 5), []);
});
