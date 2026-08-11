import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import ts from "typescript";
import { createServer } from "vite";

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
const vite = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("..", import.meta.url)),
  appType: "custom",
  server: { middlewareMode: true },
});
const browserAggregate = await vite.ssrLoadModule(
  "/lib/evidence/browser-aggregate.ts",
);

after(async () => {
  await vite.close();
});

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

test("browser resolver accepts any PubChem name and returns an exact structure candidate", async () => {
  const calls = [];
  const fakeFetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/compound/name/Quercetin/cids/JSON")) {
      return Response.json({ IdentifierList: { CID: [5280343] } });
    }
    if (url.includes("/compound/cid/5280343/property/")) {
      return Response.json({
        PropertyTable: {
          Properties: [{
            CID: 5280343,
            Title: "Quercetin",
            IUPACName: "2-(3,4-dihydroxyphenyl)-3,5,7-trihydroxychromen-4-one",
            MolecularFormula: "C15H10O7",
            MolecularWeight: 302.24,
            Charge: 0,
            CovalentUnitCount: 1,
            DefinedAtomStereoCount: 0,
            UndefinedAtomStereoCount: 0,
            InChIKey: "REFJWTPEDVJJIY-UHFFFAOYSA-N",
            SMILES: "C1=CC(=C(C=C1C2=C(C(=O)C3=C(C=C(C=C3O2)O)O)O)O)O",
          }],
        },
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const resolution = await browserAggregate.resolveBrowserCompound("Quercetin", {
    fetchImpl: fakeFetch,
  });

  assert.equal(resolution.queryKind, "name");
  assert.equal(resolution.status, "resolved");
  assert.deepEqual(resolution.candidates.map((item) => item.cid), [5280343]);
  assert.match(resolution.candidates[0].iupacName, /dihydroxyphenyl/);
  assert.equal(resolution.candidates[0].charge, 0);
  assert.equal(resolution.candidates[0].covalentUnitCount, 1);
  assert.equal(resolution.candidates[0].definedAtomStereoCount, 0);
  assert.equal(resolution.candidates[0].undefinedAtomStereoCount, 0);
  assert.equal(resolution.candidates[0].entityNote, undefined);
  assert.equal(resolution.candidates[0].inchiKey, "REFJWTPEDVJJIY-UHFFFAOYSA-N");
  assert.equal(calls.length, 2);
});

test("browser resolver maps an exact Chinese compound name before querying PubChem", async () => {
  const calls = [];
  const fakeFetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/compound/name/Quercetin/cids/JSON")) {
      return Response.json({ IdentifierList: { CID: [5280343] } });
    }
    if (url.includes("/compound/cid/5280343/property/")) {
      return Response.json({
        PropertyTable: {
          Properties: [{
            CID: 5280343,
            Title: "Quercetin",
            MolecularFormula: "C15H10O7",
            InChIKey: "REFJWTPEDVJJIY-UHFFFAOYSA-N",
          }],
        },
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const resolution = await browserAggregate.resolveBrowserCompound("槲皮素", {
    fetchImpl: fakeFetch,
  });

  assert.equal(resolution.query, "槲皮素");
  assert.equal(resolution.queryKind, "name");
  assert.equal(resolution.status, "resolved");
  assert.deepEqual(resolution.candidates.map((item) => item.cid), [5280343]);
  assert.match(resolution.message, /已将槲皮素关联为Quercetin，请确认结构/);
  assert.equal(calls.length, 2);
});

test("browser resolver explains when a Chinese compound name is not curated", async () => {
  let fetchCalls = 0;
  const resolution = await browserAggregate.resolveBrowserCompound("尚未收录的测试分子", {
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("fetch should not be called for an unsupported Chinese name");
    },
  });

  assert.equal(resolution.queryKind, "name");
  assert.equal(resolution.status, "unsupported");
  assert.deepEqual(resolution.candidates, []);
  assert.match(resolution.message, /当前中文词库暂未收录/);
  assert.match(resolution.message, /英文名、CAS号、PubChem CID/);
  assert.equal(fetchCalls, 0);
});

test("short or family-like names remain explicit PubChem candidates", async () => {
  const fakeFetch = async (input) => {
    const url = String(input);
    if (url.includes("/compound/name/NO/cids/JSON")) {
      return Response.json({ IdentifierList: { CID: [145068, 23935] } });
    }
    if (url.includes("/compound/cid/145068,23935/property/")) {
      return Response.json({
        PropertyTable: {
          Properties: [
            { CID: 145068, Title: "Nitric oxide", MolecularFormula: "NO", InChIKey: "MWUXSHHQAYIFBG-UHFFFAOYSA-N" },
            { CID: 23935, Title: "Nobelium", MolecularFormula: "No", InChIKey: "HCWPIIXVSYCSAN-UHFFFAOYSA-N" },
          ],
        },
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const resolution = await browserAggregate.resolveBrowserCompound("NO", {
    fetchImpl: fakeFetch,
  });

  assert.equal(resolution.queryKind, "name");
  assert.equal(resolution.status, "ambiguous");
  assert.deepEqual(resolution.candidates.map((item) => item.title), ["Nitric oxide", "Nobelium"]);
});

test("Pages evidence aggregation is CID-keyed and has no curated catalog dependency", async () => {
  const source = await readFile(
    new URL("../lib/evidence/browser-aggregate.ts", import.meta.url),
    "utf8",
  );
  const appSource = await readFile(
    new URL("../github-pages/src/App.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /getCatalogEntryByPubchemCid|GINSENOSIDE_CATALOG/);
  assert.match(source, /natural-product-evidence:[^`]*:cid:\$\{cid\}/);
  assert.match(source, /query:\s*compound\.title/);
  assert.doesNotMatch(source, /aliases:\s*\[entry\./);
  assert.match(appSource, /resolution\.queryKind === "cid" \|\| resolution\.queryKind === "inchikey"/);
  assert.match(appSource, /确认此结构/);
});
