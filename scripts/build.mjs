import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const dist=resolve(root,"dist");
const readSite=name=>readFile(resolve(root,"site",name),"utf8");
const [html,css,js,robots,sitemap,engine,runtime,hosting,historyMeta,pumpA,pumpB,eurA,eurB,btcSeed,ethSeed,solSeed,futuresSeed,premiumSeed,fundingSeed]=await Promise.all([
  readSite("index.html"),readSite("styles.css"),readSite("app.js"),readSite("robots.txt"),readSite("sitemap.xml"),
  readFile(resolve(root,"server/engine.js"),"utf8"),readFile(resolve(root,"server/worker.js"),"utf8"),readFile(resolve(root,".openai/hosting.json"),"utf8"),
  ...["history-meta","pump-a","pump-b","eur-a","eur-b","btc"].map(name=>readFile(resolve(root,`data/${name}.json`),"utf8")),
  ...["eth","sol","futures","premium","funding"].map(name=>readFile(resolve(root,`data/context-${name}.json`),"utf8"))
]);
const seed="const HISTORY_SEED=Object.assign("+[historyMeta,btcSeed,ethSeed,solSeed,futuresSeed,premiumSeed,fundingSeed].join(",")+");HISTORY_SEED.pump="+pumpA+".concat("+pumpB+");HISTORY_SEED.eur="+eurA+".concat("+eurB+");\n";
const assets="const assets=new Map("+JSON.stringify([
  ["/",{body:html,type:"text/html; charset=utf-8"}],
  ["/index.html",{body:html,type:"text/html; charset=utf-8"}],
  ["/de",{body:html,type:"text/html; charset=utf-8"}],
  ["/de/",{body:html,type:"text/html; charset=utf-8"}],
  ["/tr",{body:html,type:"text/html; charset=utf-8"}],
  ["/tr/",{body:html,type:"text/html; charset=utf-8"}],
  ["/pulse-v10.css",{body:css,type:"text/css; charset=utf-8"}],
  ["/pulse-v18.js",{body:js,type:"text/javascript; charset=utf-8"}],
  ["/robots.txt",{body:robots,type:"text/plain; charset=utf-8"}],
  ["/sitemap.xml",{body:sitemap,type:"application/xml; charset=utf-8"}]
])+");\n";
await rm(dist,{recursive:true,force:true});
await mkdir(resolve(dist,"server"),{recursive:true});
await mkdir(resolve(dist,".openai"),{recursive:true});
await writeFile(resolve(dist,"server/index.js"),engine+"\n"+seed+assets+runtime);
await writeFile(resolve(dist,".openai/hosting.json"),hosting);
console.log("Built "+dist);
