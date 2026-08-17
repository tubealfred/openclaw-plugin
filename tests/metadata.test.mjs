import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function expectedTools() {
  const contract = await readJson("../contracts/tubealfred-youtube-operations.v1.json");

  return [
    "tubealfred_billing_usage",
    ...contract.operations.map((operation) => operation.clients.agent_tool.name),
  ];
}

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("package uses the intended OpenClaw package identity", async () => {
  const pkg = await readJson("../package.json");

  assert.equal(pkg.name, "@tubealfred/tubealfred-youtube");
  assert.equal(pkg.openclaw.extensions[0], "./dist/index.js");
  assert.equal(pkg.openclaw.install.clawhubSpec, "@tubealfred/tubealfred-youtube");
});

test("manifest declares full TubeAlfred tool coverage", async () => {
  const manifest = await readJson("../openclaw.plugin.json");

  assert.equal(manifest.id, "tubealfred-youtube");
  const expected = await expectedTools();

  assert.deepEqual(manifest.contracts.tools, expected);
  assert.equal(new Set(manifest.contracts.tools).size, expected.length);
});

test("manifest keeps API key config sensitive", async () => {
  const manifest = await readJson("../openclaw.plugin.json");

  assert.equal(manifest.uiHints.apiKey.sensitive, true);
  assert.equal(manifest.configSchema.additionalProperties, false);
});

test("manifest leaves response margin above the API timeout", async () => {
  const manifest = await readJson("../openclaw.plugin.json");

  assert.equal(manifest.uiHints.timeoutMs.placeholder, "35000");
  assert.equal(manifest.configSchema.properties.timeoutMs.default, 35000);
});
