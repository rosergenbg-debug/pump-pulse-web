import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const dist=resolve(root,"dist");
const readSite=name=>readFile(resolve(root,name),"utf8");
const [html,css,js,robots,engine,runtime,hosting,historySeed]=await Promise.all([
  readSite("index.html"),readSite("styles.css"),readSite("app.js"),readSite("robots.txt"),
  readFile(resolve(root,"server/engine.js"),"utf8"),readFile(resolve(root,"server/worker.js"),"utf8"),readFile(resolve(root,".openai/hosting.json"),"utf8"),readFile(resolve(root,"data/history-seed.json"),"utf8")
]);
const seed="const HISTORY_SEED="+historySeed+";\n";
const assets="const assets=new Map("+JSON.stringify([
  ["/",{body:html,type:"text/html; charset=utf-8"}],
  ["/index.html",{body:html,type:"text/html; charset=utf-8"}],
  ["/pulse-v6.css",{body:css,type:"text/css; charset=utf-8"}],
  ["/pulse-v12.js",{body:js,type:"text/javascript; charset=utf-8"}],
  ["/robots.txt",{body:robots,type:"text/plain; charset=utf-8"}]
])+");\n";
await rm(dist,{recursive:true,force:true});
await mkdir(resolve(dist,"server"),{recursive:true});
await mkdir(resolve(dist,".openai"),{recursive:true});
await writeFile(resolve(dist,"server/index.js"),engine+"\n"+seed+assets+runtime);
await writeFile(resolve(dist,".openai/hosting.json"),hosting);
console.log("Built "+dist);
