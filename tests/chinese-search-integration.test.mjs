import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function importSearchRoute() {
  const entryPoint = fileURLToPath(
    new URL("../app/api/search/route.ts", import.meta.url),
  );
  const stubs = new Map([
    ["db", `export const isDatabaseUnavailableError = () => false;`],
    ["storage", `export const consumeRateLimit = async () => null;`],
    ["compound-api", `
      export const COMPOUND_SEARCH_RATE_BUCKET = "test";
      export const chineseRegistryCandidate = (entry) => ({
        cid: entry.cid,
        title: entry.englishName,
        pubchemUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/" + entry.cid,
      });
      export const requiresStructureConfirmation = (kind) => kind === "name";
      export const toSearchCandidate = (compound) => compound;
    `],
    ["pubchem", `
      export async function resolvePubChemCompound(query) {
        globalThis.__chineseSearchPubChemQuery = query;
        const queryKind = /^\\d+$/.test(query) ? "cid" : "name";
        if (globalThis.__chineseSearchPubChemUnavailable) {
          return {
            status: "not_found",
            queryKind,
            candidates: [],
            source: { status: "error", totalAvailable: 0, truncated: false },
          };
        }
        const compound = {
          cid: queryKind === "cid" ? Number(query) : 969516,
          title: queryKind === "cid" ? "CID compound" : query,
          pubchemUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/969516",
        };
        return {
          status: "resolved",
          queryKind,
          selected: compound,
          candidates: [compound],
          source: { status: "ok", totalAvailable: 1, truncated: false },
        };
      }
    `],
  ]);
  const aliases = new Map([
    ["@/db", "db"],
    ["@/lib/storage", "storage"],
    ["@/lib/evidence/compound-api", "compound-api"],
    ["@/lib/evidence/sources/pubchem", "pubchem"],
  ]);

  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    write: false,
    plugins: [{
      name: "search-route-stubs",
      setup(esbuild) {
        esbuild.onResolve({ filter: /^@\// }, (args) => {
          const stub = aliases.get(args.path);
          return stub ? { path: stub, namespace: "search-stub" } : undefined;
        });
        esbuild.onLoad({ filter: /.*/, namespace: "search-stub" }, (args) => ({
          contents: stubs.get(args.path),
          loader: "js",
        }));
      },
    }],
  });

  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}#${Date.now()}`
  );
}

test("search API resolves an exact CSV Chinese name by CID and still requires structure confirmation", async () => {
  const route = await importSearchRoute();
  const response = await route.POST(new Request("https://example.test/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "姜黄素" }),
  }));
  const payload = await response.json();

  assert.equal(globalThis.__chineseSearchPubChemQuery, "969516");
  assert.equal(payload.status, "ambiguous");
  assert.equal(payload.queryKind, "name");
  assert.equal(payload.interpretedQuery, "CURCUMIN");
  assert.equal(payload.matchedChineseName, "姜黄素");
  assert.equal(payload.candidates[0].cid, 969516);
});

test("exact identifiers remain eligible for automatic resolution", async () => {
  const route = await importSearchRoute();
  const response = await route.POST(new Request("https://example.test/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "2244" }),
  }));
  const payload = await response.json();

  assert.equal(payload.status, "resolved");
  assert.equal(payload.queryKind, "cid");
  assert.equal(payload.compound.cid, 2244);
  assert.equal(payload.interpretedQuery, "2244");
  assert.equal("matchedChineseName" in payload, false);
});

test("search API keeps an exact Chinese CID usable during a PubChem outage", async () => {
  globalThis.__chineseSearchPubChemUnavailable = true;
  try {
    const route = await importSearchRoute();
    const response = await route.POST(new Request("https://example.test/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "人参皂苷 rb3" }),
    }));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(globalThis.__chineseSearchPubChemQuery, "12912363");
    assert.equal(payload.status, "ambiguous");
    assert.equal(payload.queryKind, "name");
    assert.equal(payload.candidates[0].cid, 12912363);
    assert.match(payload.warning, /中国日化前沿靶点与植物化学数据库/);
  } finally {
    delete globalThis.__chineseSearchPubChemUnavailable;
  }
});

test("SearchForm submits the user's term and uses the shared Chinese suggestion index", async () => {
  const source = await readFile(
    new URL("../app/components/SearchForm.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /findChineseCompoundSuggestions\(query,\s*6\)/);
  assert.match(source, /JSON\.stringify\(\{ query: clean \}\)/);
  assert.doesNotMatch(source, /apiQuery/);
  assert.match(source, /中文快捷入口/);
  assert.doesNotMatch(source, /已收录.*常见化合物中文名称及常用别名/);
});

test("both result UIs expose concise CID-confirmed research summaries", async () => {
  const [pagesSource, sitesSource] = await Promise.all([
    readFile(new URL("../github-pages/src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/CompoundExplorer.tsx", import.meta.url), "utf8"),
  ]);

  for (const source of [pagesSource, sitesSource]) {
    assert.match(source, /CSV 精确关联 CID/);
    assert.match(source, /相关功效摘要/);
    assert.match(source, /同时链接 PubChem/);
    assert.match(source, /结果生成日期/);
    assert.doesNotMatch(source, /确认 PubChem CID 后，从 PubMed \/ Europe PMC 题录与摘要中筛选/);
  }
});

test("result payloads expose only the generation date in coverage copy", async () => {
  const [browserAggregate, compoundRoute] = await Promise.all([
    readFile(new URL("../lib/evidence/browser-aggregate.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/compound/[cid]/route.ts", import.meta.url), "utf8"),
  ]);

  for (const source of [browserAggregate, compoundRoute]) {
    assert.match(source, /结果生成日期/);
    assert.doesNotMatch(source, /已汇聚当前接入数据库|正在等待更新或扩展接入/);
  }
});
