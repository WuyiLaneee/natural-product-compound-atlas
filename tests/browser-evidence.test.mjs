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

const browserFetch = await importStandaloneTypeScript(
  "../lib/evidence/browser-fetch.ts",
);
const browserCache = await importStandaloneTypeScript(
  "../lib/evidence/browser-cache.ts",
);

function mapStorage(initial = []) {
  const records = new Map(initial);
  return {
    records,
    getItem(key) {
      return records.get(key) ?? null;
    },
    setItem(key, value) {
      records.set(key, value);
    },
    removeItem(key) {
      records.delete(key);
    },
  };
}

test("browser fetch adapter strips preflight-causing identification headers", async () => {
  let observed;
  const fakeFetch = async (input, init) => {
    observed = { input, init };
    return new Response('{"ok":true}', {
      headers: { "content-type": "application/json" },
    });
  };
  const fetchImpl = browserFetch.createBrowserFetchImpl(fakeFetch);

  await fetchImpl("https://example.test/public.json", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "server-agent",
      "X-Client-Name": "GinsenosideEvidenceAtlas",
    },
  });

  const headers = new Headers(observed.init.headers);
  assert.equal(headers.get("accept"), "application/json");
  assert.equal(headers.has("user-agent"), false);
  assert.equal(headers.has("x-client-name"), false);
  assert.equal(observed.init.credentials, "omit");
  assert.equal(observed.init.mode, "cors");
});

test("browser fetch adapter preserves an upstream abort signal", async () => {
  const controller = new AbortController();
  let observedSignal;
  const fakeFetch = async (_input, init) => {
    observedSignal = init.signal;
    return new Response("{}");
  };

  await browserFetch.createBrowserFetchImpl(fakeFetch)("https://example.test", {
    signal: controller.signal,
  });
  assert.equal(observedSignal, controller.signal);
});

test("browser cache round-trips a versioned six-hour payload envelope", () => {
  const storage = mapStorage();
  const payload = { compound: { cid: 441923 }, claims: [] };
  const now = Date.UTC(2026, 7, 11, 0, 0, 0);
  const ttlMs = 6 * 60 * 60 * 1_000;

  browserCache.writeBrowserCache({
    key: "evidence:441923",
    schemaVersion: "v1",
    payload,
    ttlMs,
    now,
    storage,
  });
  const cached = browserCache.readBrowserCache({
    key: "evidence:441923",
    schemaVersion: "v1",
    storage,
    validatePayload: (value) => value?.compound?.cid === 441923,
  });

  assert.deepEqual(cached.payload, payload);
  assert.equal(cached.savedAt, now);
  assert.equal(cached.expiresAt, now + ttlMs);
});

test("browser cache removes corrupt, wrong-version and wrong-compound records", () => {
  const corrupt = mapStorage([["corrupt", "{not-json"]]);
  const invalid = browserCache.readBrowserCache({
    key: "corrupt",
    schemaVersion: "v1",
    storage: corrupt,
    validatePayload: () => true,
  });
  assert.equal(invalid, null);
  assert.equal(corrupt.records.has("corrupt"), false);

  const wrongVersion = mapStorage();
  browserCache.writeBrowserCache({
    key: "evidence",
    schemaVersion: "old",
    payload: { compound: { cid: 1 } },
    ttlMs: 1_000,
    now: 100,
    storage: wrongVersion,
  });
  assert.equal(
    browserCache.readBrowserCache({
      key: "evidence",
      schemaVersion: "new",
      storage: wrongVersion,
      validatePayload: () => true,
    }),
    null,
  );
  assert.equal(wrongVersion.records.has("evidence"), false);

  const wrongCompound = mapStorage();
  browserCache.writeBrowserCache({
    key: "evidence",
    schemaVersion: "v1",
    payload: { compound: { cid: 1 } },
    ttlMs: 1_000,
    now: 100,
    storage: wrongCompound,
  });
  assert.equal(
    browserCache.readBrowserCache({
      key: "evidence",
      schemaVersion: "v1",
      storage: wrongCompound,
      validatePayload: (value) => value?.compound?.cid === 2,
    }),
    null,
  );
});

test("browser cache falls back to memory when persistent writes are blocked", () => {
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  const key = `blocked:${Date.now()}`;
  browserCache.writeBrowserCache({
    key,
    schemaVersion: "v1",
    payload: { ok: true },
    ttlMs: 1_000,
    now: 100,
    storage: blocked,
  });
  const cached = browserCache.readBrowserCache({
    key,
    schemaVersion: "v1",
    storage: blocked,
    validatePayload: (value) => value?.ok === true,
  });
  assert.equal(cached.payload.ok, true);
  browserCache.removeBrowserCache(key);
});
