import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost"), {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the corporate research homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /巨子生物 · 人参皂苷科研信息平台/);
  assert.match(html, /从人参皂苷单体出发/);
  assert.match(html, /探索科研与创新价值/);
  assert.match(html, /PubChem/);
  assert.match(html, /ChEMBL/);
  assert.match(html, /Europe PMC/);
  assert.match(html, /ClinicalTrials\.gov/);
  assert.match(html, /巨子生物/);
  assert.match(html, /西北大学/);
  assert.match(html, /汇聚科研信息/);
  assert.doesNotMatch(html, /AUDITABLE BY DESIGN|不是黑箱摘要|把“提及”与“证明”分开|不代表医学建议|机器抽取结果会明确/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("renders the methodology and ships required brand assets", async () => {
  const [response, layout, page] = await Promise.all([
    render("/methodology"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    access(new URL("../public/brand/giant-biogene.png", import.meta.url)),
    access(new URL("../public/brand/nwu.png", import.meta.url)),
    access(new URL("../public/og-corporate.png", import.meta.url)),
  ]);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /平台介绍与数据能力/);
  assert.match(html, /连接多源科研数据/);
  assert.match(html, /定量结合/);
  assert.match(html, /权利要求相关/);
  assert.match(layout, /openGraph/);
  assert.match(page, /智能科研辅助/);
});
