import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API="https://data-api.binance.vision/api/v3/klines";
async function batch(symbol,startTime){const query=new URLSearchParams({symbol,interval:"30m",limit:"1000",startTime:String(startTime)});const response=await fetch(API+"?"+query);if(!response.ok)throw new Error(symbol+" "+response.status);const now=Date.now();return(await response.json()).map(row=>({openTime:+row[0],open:+row[1],high:+row[2],low:+row[3],close:+row[4],volume:+row[5],closeTime:+row[6],taker:+row[9]})).filter(c=>c.closeTime<now)}
async function range(symbol,start){let cursor=start,all=[];while(cursor<Date.now()){const rows=await batch(symbol,cursor);if(!rows.length)break;all.push(...rows);cursor=rows.at(-1).closeTime+1;if(rows.length<1000)break}return[...new Map(all.map(c=>[c.closeTime,c])).values()].sort((a,b)=>a.closeTime-b.closeTime)}
const start=Date.now()-183*86400000;
const [pump,eur,btc]=await Promise.all([range("PUMPUSDT",start),range("EURUSDT",start),range("BTCUSDT",start)]);
const compact=c=>[c.openTime,c.open,c.high,c.low,c.close,c.volume,c.closeTime,c.taker];
const data={generatedAt:Date.now(),pump:pump.map(compact),eur:eur.map(compact),btc:btc.map(c=>[c.closeTime,c.close])};
await mkdir(resolve("data"),{recursive:true});
await writeFile(resolve("data/history-seed.json"),JSON.stringify(data));
console.log(JSON.stringify({generatedAt:new Date(data.generatedAt).toISOString(),pump:pump.length,eur:eur.length,btc:btc.length}));
