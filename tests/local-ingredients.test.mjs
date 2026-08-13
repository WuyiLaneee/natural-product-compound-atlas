import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function importStandaloneTypeScript(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const result = await build({
    entryPoints: [fileURLToPath(sourceUrl)],
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

const ingredients = await importStandaloneTypeScript(
  "../lib/evidence/local-ingredients.ts",
);

const EXPECTED = [
  ["五味子", "schisandra"],
  ["菝葜", "smilax-china"],
  ["巴戟天", "morinda-officinalis"],
  ["大黄酚苷", "chrysophanol-glycoside"],
  ["侧柏黄酮", "platycladus-flavonoids"],
  ["火麻仁蛋白", "hemp-seed-protein"],
];

test("database contains exactly the six reviewed ingredient dossiers", () => {
  assert.equal(
    ingredients.LOCAL_INGREDIENT_DATABASE_NAME,
    "中国日化前沿靶点与植物化学数据库",
  );
  assert.equal(ingredients.LOCAL_INGREDIENTS.length, 6);
  assert.deepEqual(
    ingredients.LOCAL_INGREDIENTS.map((record) => [
      record.identity.name,
      record.slug,
    ]),
    EXPECTED,
  );
  assert.equal(
    new Set(ingredients.LOCAL_INGREDIENTS.map((record) => record.slug)).size,
    6,
  );
});

test("every record supplies the visible research sections and literature", () => {
  for (const record of ingredients.LOCAL_INGREDIENTS) {
    assert.ok(record.identity.name);
    assert.ok(record.identity.type);
    assert.equal(
      record.source.name,
      "中国日化前沿靶点与植物化学数据库",
    );
    assert.ok(record.functionalFactors.length > 0);
    assert.ok(record.representativeComponents.length > 0);
    assert.ok(record.composition.length > 0);
    assert.ok(record.researchEffects.length > 0);
    assert.ok(record.mechanismClues.length > 0);
    assert.equal(record.literature.status, "collected");
    assert.ok(record.literature.records.length > 0);
    assert.ok(
      record.literature.records.every(
        (item) => item.title && item.effects.length > 0,
      ),
    );
  }
});

test("keeps every named or grouped literature entry from the supplied literature summary", () => {
  const expectedCounts = {
    schisandra: 10,
    "smilax-china": 10,
    "morinda-officinalis": 9,
    "chrysophanol-glycoside": 5,
    "platycladus-flavonoids": 6,
    "hemp-seed-protein": 7,
  };

  for (const ingredient of ingredients.LOCAL_INGREDIENTS) {
    assert.equal(ingredient.literature.records.length, expectedCounts[ingredient.slug]);
  }
});

test("exact reviewed names and aliases resolve after conservative normalization", () => {
  for (const [name, slug] of EXPECTED) {
    assert.equal(ingredients.resolveLocalIngredient(name)?.slug, slug);
    assert.equal(ingredients.getLocalIngredientBySlug(slug)?.identity.name, name);
  }

  assert.equal(
    ingredients.resolveLocalIngredient("　火 麻 仁 蛋 白　")?.slug,
    "hemp-seed-protein",
  );
  assert.equal(
    ingredients.resolveLocalIngredient("火麻仁蛋白质")?.slug,
    "hemp-seed-protein",
  );
  assert.equal(
    ingredients.resolveLocalIngredient("菝 葜 甾 体 皂 苷")?.slug,
    "smilax-china",
  );
  assert.equal(
    ingredients.resolveLocalIngredient("大黃酚苷")?.slug,
    "chrysophanol-glycoside",
  );
  assert.equal(
    ingredients.resolveLocalIngredient("側柏黃酮")?.slug,
    "platycladus-flavonoids",
  );
});

test("partial names, family names, typos and empty input never resolve", () => {
  const nonMatches = [
    "五味",
    "菝",
    "菝葜皂苷A",
    "巴戟",
    "大黄酚",
    "侧柏",
    "火麻仁",
    "木脂素",
    "甾体皂苷",
    "黄酮",
    "蛋白",
    "五味子错别字",
    "",
    "   ",
  ];
  for (const input of nonMatches) {
    assert.equal(
      ingredients.resolveLocalIngredient(input),
      undefined,
      `Expected no exact match for ${JSON.stringify(input)}`,
    );
  }
});

test("suggestions are ranked and limited without changing exact resolution", () => {
  assert.equal(
    ingredients.findLocalIngredientSuggestions("五味子", 6)[0]?.slug,
    "schisandra",
  );
  assert.deepEqual(
    ingredients
      .findLocalIngredientSuggestions("蛋白", 6)
      .map((record) => record.slug),
    ["hemp-seed-protein"],
  );
  assert.deepEqual(ingredients.findLocalIngredientSuggestions("原料", 0), []);
  assert.deepEqual(ingredients.findLocalIngredientSuggestions("", 6), []);
  assert.deepEqual(
    ingredients.findLocalIngredientSuggestions("不存在的原料", 6),
    [],
  );
  assert.equal(ingredients.resolveLocalIngredient("蛋白"), undefined);
});

test("all user-visible values avoid implementation and superseded source wording", () => {
  const visible = JSON.stringify({
    databaseName: ingredients.LOCAL_INGREDIENT_DATABASE_NAME,
    records: ingredients.LOCAL_INGREDIENTS,
  });
  for (const forbidden of [
    "本地",
    "预设",
    "Word",
    "word",
    "docx",
    "来源文件",
    "PubChem未调用",
  ]) {
    assert.equal(
      visible.includes(forbidden),
      false,
      `User-visible data contains forbidden wording: ${forbidden}`,
    );
  }
});

test("research boundaries preserve the reviewed quantitative distinctions", () => {
  const chrysophanol = ingredients.getLocalIngredientBySlug(
    "chrysophanol-glycoside",
  );
  assert.match(chrysophanol.composition[0].basis, /对照品纯度/u);
  assert.match(chrysophanol.composition[0].boundary, /不得解读为原料/u);

  const hemp = ingredients.getLocalIngredientBySlug("hemp-seed-protein");
  assert.equal(hemp.composition.length, 4);
  assert.deepEqual(
    hemp.mechanismClues.map((clue) => clue.name),
    ["α-淀粉酶", "胰脂肪酶", "AMPK", "HMGCR", "AKT1"],
  );
  assert.ok(
    hemp.mechanismClues.every((clue) => clue.evidenceBoundary.length > 0),
  );

  for (const slug of [
    "schisandra",
    "smilax-china",
    "morinda-officinalis",
    "platycladus-flavonoids",
  ]) {
    assert.ok(
      ingredients
        .getLocalIngredientBySlug(slug)
        .mechanismClues.some((clue) =>
          clue.details.includes("未提供具体分子靶点"),
        ),
    );
  }
});
