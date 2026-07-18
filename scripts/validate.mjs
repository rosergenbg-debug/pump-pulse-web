import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const hosting = JSON.parse(await readFile(resolve(root, "dist/.openai/hosting.json"), "utf8"));
assert.equal(hosting.project_id, "appgprj_6a5b9ad4240481919614afacb6f2aa6f");
const source = await readFile(resolve(root, "dist/server/index.js"), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const worker = await import(moduleUrl);
assert.equal(typeof worker.default?.fetch, "function");
for (const [path, type] of [["/", "text/html"], ["/pulse-v4.css", "text/css"], ["/pulse-v10.js", "text/javascript"]]) {
  const response = await worker.default.fetch(new Request(`https://example.test${path}`));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), new RegExp(type));
  assert.ok((await response.text()).length > 100);
}
const missing = await worker.default.fetch(new Request("https://example.test/missing"));
assert.equal(missing.status, 404);
console.log("Validated worker routes, hosting metadata and response types");
