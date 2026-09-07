import fs from 'fs';

const START=Date.parse('2026-02-01T00:00:00Z');
const END=Date.parse('2026-08-01T00:00:00Z');
const CANDIDATES=['PUMPUSDT','WIFUSDT','BONKUSDT','PEPEUSDT','DOGEUSDT','FLOKIUSDT','SHIBUSDT'];
const API='https://data-api.binance.vision/api/v3/klines';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function klines(symbol,interval,start,end){
  const out=[]; let cursor=start;
  while(cursor<end){
    const u=new URL(API); u.searchParams.set('symbol',symbol);u.searchParams.set('interval',interval);u.searchParams.set('startTime',String(cursor));u.searchParams.set('endTime',String(end-1));u.searchParams.set('limit','1000');
    const r=await fetch(u,{headers:{'user-agent':'PUMP-V14-research'}}); if(!r.ok) throw new Error(`${symbol} ${interval} HTTP ${r.status}`);
    const rows=await r.json(); if(!rows.length) break;
    for(const x of rows) out.push({openTime:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5],closeTime:+x[6],taker:+x[9]});
    const n=rows.at(-1)[6]+1;if(n<=cursor)break;cursor=n;await sleep(20);
  }
  return out.filter(x=>x.openTime>=start&&x.openTime<end);
}
function quantile(a,q){if(!a.length)return NaN;const s=[...a].sort((x,y)=>x-y),p=(s.length-1)*q,l=Math.floor(p),h=Math.ceil(p);return l===h?s[l]:s[l]*(h-p)+s[h]*(p-l)}
function volStats(c){
  const abs=[],ret=[],ranges=[];let gt2=0,gt4=0;
  for(let i=1;i<c.length;i++){const r=c[i].close/c[i-1].close-1;ret.push(r);abs.push(Math.abs(r));if(Math.abs(r)>=.02)gt2++;if(Math.abs(r)>=.04)gt4++;ranges.push(c[i].high/c[i].low-1)}
  const mean=abs.reduce((a,b)=>a+b,0)/Math.max(1,abs.length);const sd=Math.sqrt(ret.reduce((a,b)=>a+b*b,0)/Math.max(1,ret.length));
  return{bars:c.length,meanAbs30m:mean,p90Abs30m:quantile(abs,.9),p99Abs30m:quantile(abs,.99),rms30m:sd,p90Range30m:quantile(ranges,.9),freq2:gt2/Math.max(1,abs.length),freq4:gt4/Math.max(1,abs.length)};
}
function distance(a,b){const keys=['meanAbs30m','p90Abs30m','p99Abs30m','rms30m','p90Range30m','freq2','freq4'];return Math.sqrt(keys.reduce((s,k)=>s+Math.pow(Math.log((b[k]+1e-8)/(a[k]+1e-8)),2),0)/keys.length)}

// V14 reconstruction: same recoverable filter family, generalized target symbol; BTC remains market context.
function ema(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;let x=v.slice(0,p).reduce((a,b)=>a+b,0)/p;o[p-1]=x;const k=2/(p+1);for(let i=p;i<v.length;i++){x=v[i]*k+x*(1-k);o[i]=x}return o}
function rsi(v,p=14){const o=Array(v.length).fill(null);let g=0,l=0;for(let i=1;i<v.length;i++){const d=v[i]-v[i-1],gg=Math.max(d,0),ll=Math.max(-d,0);if(i<=p){g+=gg;l+=ll;if(i===p){g/=p;l/=p}}else{g=(g*(p-1)+gg)/p;l=(l*(p-1)+ll)/p}if(i>=p)o[i]=l?100-100/(1+g/l):100}return o}
const candleReturn=(c,i,b)=>i>=b&&c[i-b].close>0?c[i].close/c[i-b].close-1:0;
function indicators(asset,btc){const closes=asset.map(c=>c.close),e20=ema(closes,20),e200=ema(closes,200),rs=rsi(closes),ret=asset.map((_,i)=>candleReturn(asset,i,1)),vol=[],draw=[],shock=[],breakout=[],atr=[];const btcBy=new Map(btc.map((c,i)=>[c.closeTime,{...c,i}])),be50=ema(btc.map(c=>c.close),50),be200=ema(btc.map(c=>c.close),200);
  for(let i=0;i<asset.length;i++){if(i<19)vol[i]=0;else{const w=asset.slice(i-19,i+1).map(c=>c.volume).sort((a,b)=>a-b),m=(w[9]+w[10])/2;vol[i]=m?asset[i].volume/m:0}const hi=Math.max(...asset.slice(Math.max(0,i-71),i+1).map(c=>c.high));draw[i]=asset[i].close/hi-1;shock[i]=ret.slice(Math.max(0,i-35),i+1).filter(x=>x<=-.02).length;breakout[i]=i>=6&&asset[i].close>=Math.max(...asset.slice(i-6,i).map(c=>c.high));if(i>=13){let s=0;for(let j=i-13;j<=i;j++){const prev=j?asset[j-1].close:asset[j].open;s+=Math.max(asset[j].high-asset[j].low,Math.abs(asset[j].high-prev),Math.abs(asset[j].low-prev))}atr[i]=s/14/asset[i].close}else atr[i]=null}
 return{e20,e200,rs,ret,vol,draw,shock,breakout,atr,btcBy,btcAbove(i){const b=btcBy.get(asset[i].closeTime);return !!b&&be200[b.i]!=null&&b.close>be200[b.i]},btcSlope(i){const b=btcBy.get(asset[i].closeTime);return !!b&&b.i>=6&&be50[b.i]!=null&&be50[b.i-6]!=null&&be50[b.i]>be50[b.i-6]}}}
function signalAt(asset,ind,i){if(i<236||ind.e200[i]==null)return false;const c=asset[i],prev=asset[i-1],r=ind.rs[i]??0,rp=ind.rs[i-1]??0,extension=c.close/ind.e200[i]-1,recent6=candleReturn(asset,i,6),noChase=ind.ret[i]<.04&&recent6<.08&&extension<=.035,priceReady=extension>=0&&extension<=.035;let trendArmed=false;for(let j=Math.max(0,i-23);j<=i;j++)if((ind.rs[j]??100)<=40)trendArmed=true;const trend=trendArmed&&r>=45&&r<=55&&rp<45&&priceReady&&ind.btcAbove(i)&&ind.btcSlope(i)&&noChase;let shockArmed=false;for(let j=Math.max(1,i-35);j<=i;j++)if(ind.ret[j]<=-.03&&ind.vol[j]>=3&&(ind.rs[j]??100)<=40)shockArmed=true;const prevExt=ind.e200[i-1]?prev.close/ind.e200[i-1]-1:Infinity,previousReady=rp>=45&&rp<=55&&prevExt>=0&&prevExt<=.035;const shock=shockArmed&&r>=45&&r<=55&&priceReady&&!previousReady&&ind.btcAbove(i)&&noChase;let exArmed=false;for(let j=Math.max(0,i-11);j<=i;j++)if(ind.draw[j]<=-.06&&ind.shock[j]>=3)exArmed=true;const confirm=(ind.e20[i]!=null&&ind.e20[i-1]!=null&&c.close>=ind.e20[i]&&prev.close<ind.e20[i-1])||(ind.breakout[i]&&r>=55&&rp<55);const exhaustion=exArmed&&confirm&&r>=43&&r<=58&&(ind.atr[i]??0)>=.007&&(ind.atr[i]??1)<=.035&&ind.draw[i]<=-.06;return trend||shock||exhaustion}
function btcCrashAt(btc1mByTime,t){for(let k=0;k<30;k++){const end=t-k*60000,now=btc1mByTime.get(end),old=btc1mByTime.get(end-3*60000);if(now&&old&&old.close>0&&now.close/old.close-1<=-.03)return true}return false}
async function replay(symbol,asset,btc30,btc1){const fee=.0021,slip=.0008,ind=indicators(asset,btc30),btc1By=new Map(btc1.map(c=>[c.closeTime,c]));let signals=0,expired=0,lastEntry=-Infinity,capital=1000,peak=1000,maxDd=0,wins=0;const exits={TP:0,STOP:0,BE_PROTECT:0,BTC_CRASH:0,TIME:0},trades=[];
 for(let i=236;i<asset.length-2;i++){if(asset[i].closeTime-lastEntry<18*3600e3)continue;if(!signalAt(asset,ind,i))continue;signals++;const limit=asset[i].close*.975;let fill=-1;for(let j=i+1;j<=Math.min(i+2,asset.length-1);j++)if(asset[j].low<=limit){fill=j;break}if(fill<0){expired++;continue}lastEntry=asset[fill].openTime;const entryRaw=limit,entryCost=entryRaw*(1+fee),target=entryCost*1.05/(1-fee),stop=entryCost*.85/(1-fee),be=entryCost/(1-fee);let armed=false,reason='TIME',exitPx=asset[Math.min(fill+336,asset.length-1)].close*(1-slip),end=Math.min(fill+336,asset.length-1);
   for(let j=fill;j<=end;j++){const c=asset[j];if(c.high*(1-fee)/entryCost-1>=.03)armed=true;if(c.high>=target){reason='TP';exitPx=target;end=j;break}if(c.low<=stop){reason='STOP';exitPx=stop*(1-slip);end=j;break}if(btcCrashAt(btc1By,c.closeTime)){reason='BTC_CRASH';exitPx=c.close*(1-slip);end=j;break}if(armed&&c.low<=be){reason='BE_PROTECT';exitPx=be*(1-slip);end=j;break}}
   const net=exitPx*(1-fee)/entryCost-1;capital*=1+net;peak=Math.max(peak,capital);maxDd=Math.min(maxDd,capital/peak-1);if(net>0)wins++;exits[reason]++;trades.push({entryTime:asset[fill].openTime,exitTime:asset[end].closeTime,netPct:net*100,reason});i=end;
 }
 const gains=trades.filter(t=>t.netPct>0).reduce((a,t)=>a+t.netPct,0),loss=-trades.filter(t=>t.netPct<0).reduce((a,t)=>a+t.netPct,0);return{symbol,signals,expired,trades:trades.length,wins,winRate:trades.length?wins/trades.length*100:0,avgNet:trades.length?trades.reduce((a,t)=>a+t.netPct,0)/trades.length:0,profitFactor:loss?gains/loss:null,compoundPct:(capital/1000-1)*100,maxDdPct:maxDd*100,exits,tradeList:trades}}

const series={};for(const s of CANDIDATES){try{series[s]=await klines(s,'30m',START,END);console.log(s,series[s].length)}catch(e){console.log('skip',s,e.message)}}const stats={};for(const [s,c] of Object.entries(series))if(c.length>5000)stats[s]=volStats(c);if(!stats.PUMPUSDT)throw new Error('PUMPUSDT unavailable');for(const [s,v] of Object.entries(stats))v.distanceToPump=s==='PUMPUSDT'?0:distance(stats.PUMPUSDT,v);const ranked=Object.entries(stats).filter(([s])=>s!=='PUMPUSDT').sort((a,b)=>a[1].distanceToPump-b[1].distanceToPump);console.log('\nVOLATILITY RANKING vs PUMP');for(const [s,v] of ranked)console.log(s,JSON.stringify(v));const chosen=ranked[0]?.[0];if(!chosen)throw new Error('No comparable candidate');console.log('\nCHOSEN',chosen);
const btc30=series.BTCUSDT||await klines('BTCUSDT','30m',START,END);const btc1=await klines('BTCUSDT','1m',START,END);const result=await replay(chosen,series[chosen],btc30,btc1);const output={window:{start:new Date(START).toISOString(),end:new Date(END).toISOString()},stats,chosen,result};fs.writeFileSync('volatility_v14_crossmarket_result.json',JSON.stringify(output,null,2));console.log('\nV14 REPLAY');console.log(JSON.stringify(result,null,2));