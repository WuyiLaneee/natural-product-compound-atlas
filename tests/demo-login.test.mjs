import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
  entryPoints: [fileURLToPath(new URL("../lib/demo-login.ts", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  write: false,
});
const login = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

test("accepts only the configured showcase credentials", () => {
  assert.equal(login.validateDemoCredentials("zgrh001", "abc123456"), true);
  assert.equal(login.validateDemoCredentials(" zgrh001 ", "abc123456"), true);
  assert.equal(login.validateDemoCredentials("zgrh001", "wrong"), false);
  assert.equal(login.validateDemoCredentials("other", "abc123456"), false);
  assert.equal(login.validateDemoCredentials("", ""), false);
});

test("uses an exact one-second authenticated transition", () => {
  assert.equal(login.DEMO_LOGIN_TRANSITION_MS, 1000);
});
