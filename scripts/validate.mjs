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
for (const [path, type] of [["/", "text/html"], ["/pulse-v5.css", "text/css"], ["/pulse-v11.js", "text/javascript"]]) {
  const response = await worker.default.fetch(new Request(`https://example.test${path}`));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), new RegExp(type));
  assert.ok((await response.text()).length > 100);
}
const missing = await worker.default.fetch(new Request("https://example.test/missing"));
assert.equal(missing.status, 404);
const inserted=[];
const DB={prepare(sql){let values=[];return{bind(...args){values=args;return this},async run(){if(sql.startsWith("INSERT INTO pump_pulse_messages"))inserted.push(values);return{}},async first(){return null},async all(){return{results:[]}}}}};
const env={DB,AUTHOR_ACCESS_TOKEN:"private-test-token"};
const contact=await worker.default.fetch(new Request("https://example.test/contact-message",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"44",email:"",message:"Hi",language:"en"})}),env);
assert.equal(contact.status,201);
assert.equal(inserted.length,1);
const access=await worker.default.fetch(new Request("https://example.test/author-access?key=private-test-token"),env);
assert.equal(access.status,302);
assert.match(access.headers.get("set-cookie"),/pump_pulse_owner=/);
const ownerCookie=access.headers.get("set-cookie").split(";")[0];
const inbox=await worker.default.fetch(new Request("https://example.test/private-author-inbox",{headers:{cookie:ownerCookie}}),env);
assert.equal(inbox.status,200);
console.log("Validated worker routes, hosting metadata and response types");
