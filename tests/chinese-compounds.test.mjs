import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const registry = await importStandaloneTypeScript(
  "../lib/evidence/chinese-compounds.ts",
);

test("registry contains the CSV catalogue plus curated extensions with stable PubChem CIDs", () => {
  assert.ok(registry.CHINESE_COMPOUND_ENTRIES.length >= 581);

  const labels = registry.CHINESE_COMPOUND_ENTRIES.map((entry) => entry.labelZh);
  const cids = registry.CHINESE_COMPOUND_ENTRIES.map((entry) => entry.cid);
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(new Set(cids).size, cids.length);
  assert.ok(
    registry.CHINESE_COMPOUND_ENTRIES.every(
      (entry) =>
        entry.labelZh &&
        entry.englishName &&
        Number.isSafeInteger(entry.cid) &&
        entry.cid > 0 &&
        entry.source,
    ),
  );
  assert.equal(
    registry.CHINESE_COMPOUND_ENTRIES.filter(
      (entry) => entry.source === "cosmetic-small-molecules-pubchem-csv",
    ).length,
    581,
  );
});

test("exact Chinese names resolve to PubChem-ready English names", () => {
  assert.equal(
    registry.resolveChineseCompoundName("姜黄素")?.cid,
    969516,
  );
  assert.equal(
    registry.resolveChineseCompoundName("咖啡因")?.cid,
    2519,
  );
  assert.equal(
    registry.resolveChineseCompoundName("人参皂苷 Rg1")?.cid,
    441923,
  );
  assert.equal(
    registry.resolveChineseCompoundName("维生素 C")?.cid,
    54670067,
  );
});

test("all CSV names resolve to their reviewed English name and PubChem CID", async () => {
  const source = await readFile(
    new URL(
      "../data/cosmetic_small_molecules_pubchem.csv",
      import.meta.url,
    ),
    "utf8",
  );
  const rows = source
    .trim()
    .split(/\r?\n/u)
    .slice(1);
  assert.equal(rows.length, 581);

  const parseRow = (row) => {
    const fields = [];
    let field = "";
    let quoted = false;
    for (let index = 0; index < row.length; index += 1) {
      const character = row[index];
      if (quoted && character === '"' && row[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        fields.push(field);
        field = "";
      } else {
        field += character;
      }
    }
    fields.push(field);
    return fields;
  };

  for (const row of rows) {
    const [labelZh, englishName, cid] = parseRow(row);
    const resolved = registry.resolveChineseCompoundName(labelZh);
    assert.ok(resolved, `Expected Chinese name "${labelZh}" to resolve`);
    assert.equal(
      resolved.englishName.toLocaleLowerCase(),
      englishName.toLocaleLowerCase(),
    );
    assert.equal(resolved.cid, Number(cid));
  }
});

test("normalization supports full-width spaces, traditional aliases and alpha/beta spellings", () => {
  assert.equal(
    registry.resolveChineseCompoundName("　薑黃素　")?.englishName,
    "CURCUMIN",
  );
  assert.equal(
    registry.resolveChineseCompoundName("ＡＬＰＨＡ 熊果苷")?.cid,
    158637,
  );
  assert.equal(
    registry.resolveChineseCompoundName("α-熊果苷")?.cid,
    158637,
  );
  assert.equal(
    registry.resolveChineseCompoundName("ＢＥＴＡ－熊果苷")?.englishName,
    "ARBUTIN",
  );
  assert.equal(
    registry.resolveChineseCompoundName("β 烟酰胺单核苷酸")?.cid,
    14180,
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
  assert.equal(exact[0].cid, 64982);

  const ginsenosides = registry.findChineseCompoundSuggestions("人参皂苷", 10);
  assert.ok(ginsenosides.some((entry) => entry.cid === 9852086));
  assert.equal(ginsenosides.length, 10);
  assert.equal(new Set(ginsenosides.map((entry) => entry.cid)).size, ginsenosides.length);

  const arbutins = registry.findChineseCompoundSuggestions("熊果苷", 10);
  assert.deepEqual(
    arbutins.map((entry) => entry.cid),
    [440936, 158637],
  );
  assert.equal(new Set(arbutins.map((entry) => entry.cid)).size, 2);
});

test("suggestion limit is safe and deterministic", () => {
  assert.deepEqual(registry.findChineseCompoundSuggestions("酸", 0), []);
  assert.equal(registry.findChineseCompoundSuggestions("酸", 3).length, 3);
  assert.deepEqual(registry.findChineseCompoundSuggestions("", 5), []);
  assert.deepEqual(registry.findChineseCompoundSuggestions("不存在的分子", 5), []);
});

test("registry builder rejects Chinese-name and CID collisions", () => {
  const base = {
    labelZh: "测试分子甲",
    englishName: "Test molecule A",
    cid: 1001,
    source: "cosmetic-small-molecules-pubchem-csv",
  };
  assert.throws(
    () =>
      registry.buildChineseCompoundRegistry([
        base,
        {
          ...base,
          englishName: "Test molecule B",
          cid: 1002,
        },
      ]),
    /Conflicting Chinese compound registry Chinese name/u,
  );
  assert.throws(
    () =>
      registry.buildChineseCompoundRegistry([
        base,
        {
          ...base,
          labelZh: "测试分子乙",
          englishName: "Test molecule B",
        },
      ]),
    /Conflicting Chinese compound registry PubChem CID/u,
  );
});
