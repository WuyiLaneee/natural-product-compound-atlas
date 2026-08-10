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

test("server-renders the evidence search homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /人参皂苷功效与靶点证据图谱/);
  assert.match(html, /从一个皂苷单体/);
  assert.match(html, /PubChem/);
  assert.match(html, /ChEMBL/);
  assert.match(html, /Europe PMC/);
  assert.match(html, /ClinicalTrials\.gov/);
  assert.match(html, /巨子生物/);
  assert.match(html, /西北大学/);
  assert.match(html, /href="\/methodology"/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("renders the methodology and ships required brand assets", async () => {
  const [response, layout, page] = await Promise.all([
    render("/methodology"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    access(new URL("../public/brand/giant-biogene.png", import.meta.url)),
    access(new URL("../public/brand/nwu.png", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
  ]);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /检索方法与覆盖边界/);
  assert.match(html, /T1/);
  assert.match(html, /P-claim/);
  assert.match(layout, /openGraph/);
  assert.match(page, /机器抽取/);
});
