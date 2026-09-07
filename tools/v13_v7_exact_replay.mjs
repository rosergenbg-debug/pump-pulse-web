import fs from 'node:fs';
import crypto from 'node:crypto';

const spec = JSON.parse(fs.readFileSync('research/PUMP_BEST_DIP_EXACT.json','utf8'));
const C = spec.config;
const [startArg,endArg,outArg='v13_v7_exact_result.json'] = process.argv.slice(2);
if(!startArg || !endArg) throw new Error('usage: node tools/v13_v7_exact_replay.mjs START END [OUT]');
const START = Date.parse(startArg), END = Date.parse(endArg);
const MIN=60000, REQUIRED=10080;
const FETCH_START=START-(REQUIRED+5)*MIN;
const FETCH_END=END+(C.max_hold_minutes+C.limit_ttl_minutes+10)*MIN;
const API='https://data-api.binance.vision/api/v3/klines';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function fetchKlines(symbol){
  const rows=[]; let cursor=FETCH_START;
  while(cursor<FETCH_END){
    const u=new URL(API);
    u.searchParams.set('symbol',symbol);u.searchParams.set('interval','1m');
    u.searchParams.set('startTime',String(cursor));u.searchParams.set('endTime',String(FETCH_END-1));u.searchParams.set('limit','1000');
    const r=await fetch(u,{headers:{'user-agent':'PUMP-V13-V7-exact-replay'}});
    if(!r.ok) throw new Error(`${symbol} HTTP ${r.status}`);
    const chunk=await r.json(); if(!chunk.length) break;
    rows.push(...chunk);
    const next=Number(chunk.at(-1)[6])+1;if(next<=cursor)throw new Error(`${symbol} cursor stall`);
    cursor=next;await sleep(4);
  }
  return rows;
}
function shaRaw(rows){const h=crypto.createHash('sha256');for(const r of rows)h.update(JSON.stringify(r)+'\n');return h.digest('hex');}
function parsePump(raw,btcMap,solMap){return raw.map(r=>{const t=+r[0];return{t,o:+r[1],h:+r[2],l:+r[3],c:+r[4],q:+r[7],buy:+r[10],n:+r[8],btc:btcMap.get(t),sol:solMap.get(t)}});}
function prefix(arr){const p=new Float64Array(arr.length+1);for(let i=0;i<arr.length;i++)p[i+1]=p[i]+arr[i];return p;}
const winSum=(p,a,z)=>p[z+1]-p[a];

function precompute(b){
  const n=b.length;
  const q=new Float64Array(n),typQ=new Float64Array(n),share=new Float64Array(n),gain=new Float64Array(n),loss=new Float64Array(n),
        tr=new Float64Array(n),logr=new Float64Array(n),abslog=new Float64Array(n),sqlog=new Float64Array(n),
        count=new Float64Array(n),size=new Float64Array(n),cvdNum=new Float64Array(n),illiBase=new Float64Array(n),
        maxH=new Float64Array(n),minL=new Float64Array(n),runLen=new Uint32Array(n);
  const dqMax=[],dqMin=[];let hm=0,hn=0,lm=0,ln=0;
  for(let i=0;i<n;i++){
    const r=b[i];
    q[i]=r.q;typQ[i]=((r.h+r.l+r.c)/3)*r.q;share[i]=r.q>0?r.buy/r.q:0;count[i]=r.n;size[i]=r.n>0?r.q/r.n:0;cvdNum[i]=2*r.buy-r.q;
    if(i>0){
      const d=r.c-b[i-1].c;gain[i]=Math.max(0,d);loss[i]=Math.max(0,-d);
      tr[i]=Math.max(r.h-r.l,Math.max(Math.abs(r.h-b[i-1].c),Math.abs(r.l-b[i-1].c)));
      logr[i]=Math.log(r.c/b[i-1].c);abslog[i]=Math.abs(logr[i]);sqlog[i]=logr[i]*logr[i];
      illiBase[i]=abslog[i]/Math.max(r.q,1e-12);
    }else tr[i]=r.h-r.l;
    const valid=[r.o,r.h,r.l,r.c,r.btc,r.sol].every(x=>Number.isFinite(x)&&x>0)&&Number.isFinite(r.q)&&r.q>=0&&Number.isFinite(r.buy)&&r.buy>=0&&r.buy<=r.q&&r.n>=0&&r.t%MIN===0&&r.h>=Math.max(r.o,r.c)&&r.l<=Math.min(r.o,r.c);
    runLen[i]=valid ? ((i>0&&r.t-b[i-1].t===MIN)?runLen[i-1]+1:1) : 0;
    while(hm<hn&&dqMax[hm]<i-C.drawdown_window_minutes+1)hm++;
    while(hm<hn&&b[dqMax[hn-1]].h<=r.h)hn--;
    dqMax[hn++]=i;maxH[i]=b[dqMax[hm]].h;
    while(lm<ln&&dqMin[lm]<i-C.structure_window_minutes+1)lm++;
    while(lm<ln&&b[dqMin[ln-1]].l>=r.l)ln--;
    dqMin[ln++]=i;minL[i]=b[dqMin[lm]].l;
  }
  return{
    q,typQ,share,gain,loss,tr,logr,abslog,sqlog,count,size,cvdNum,illiBase,maxH,minL,runLen,
    pq:prefix(q),ptypQ:prefix(typQ),pshare:prefix(share),pgain:prefix(gain),ploss:prefix(loss),ptr:prefix(tr),
    pabs:prefix(abslog),psq:prefix(sqlog),pcount:prefix(count),psize:prefix(size),pcvd:prefix(cvdNum),pilli:prefix(illiBase)
  };
}
function calculate(b,i,P){
  const ratioPrev=(w,cur,p)=>{const mean=(p[i]-p[i-w])/w;return mean>0?cur/mean:NaN;};
  const r=b[i],vw=C.vwap_window_minutes;
  const qsum=winSum(P.pq,i-vw+1,i),vwap=winSum(P.ptypQ,i-vw+1,i)/qsum;
  const rp=C.rsi_period_minutes,g=winSum(P.pgain,i-rp+1,i),l=winSum(P.ploss,i-rp+1,i);
  const rsi=(l===0&&g>0)?100:(g===0?0:100-100/(1+g/l));
  const ap=C.atr_period_minutes,atr=winSum(P.ptr,i-ap+1,i)/ap/r.c;
  const fw=C.buy_flow_window_minutes;
  const flow=winSum(P.pshare,i-fw+1,i)/fw,previousFlow=winSum(P.pshare,i-2*fw+1,i-fw)/fw;
  const mw=C.micro_window_minutes;
  const vol=Math.sqrt(winSum(P.psq,i-mw+1,i)),path=winSum(P.pabs,i-mw+1,i);
  const ill=ratioPrev(mw,P.illiBase[i],P.pilli);
  return{
    vwap:r.c/vwap-1,drawdown:r.c/P.maxH[i]-1,
    volume:ratioPrev(C.volume_window_minutes,r.q,P.pq),
    pump:r.c/b[i-C.pump_return_window_minutes].c-1,
    rsi,atr,rebound:r.c/P.minL[i]-1,
    flow,slope:flow-previousFlow,
    btc:r.btc/b[i-C.btc_return_window_minutes].btc-1,
    sol:r.sol/b[i-C.sol_return_window_minutes].sol-1,
    intensity:ratioPrev(mw,r.n,P.pcount),
    size:ratioPrev(mw,P.size[i],P.psize),
    cvd:winSum(P.pcvd,i-mw+1,i)/winSum(P.pq,i-mw+1,i),
    volatility:vol,
    efficiency:path>0?Math.abs(Math.log(r.c/b[i-mw].c))/path:0,
    illiquidity:Number.isNaN(ill)?0:ill
  };
}
function rejectionReasons(b,i,f){
  const failed=[],r=b[i];
  const check=(name,ok)=>{if(!ok)failed.push(name)};
  const range=(key,lo,hi)=>check(key,Number.isFinite(f[key])&&f[key]>=C[lo]&&f[key]<=C[hi]);
  const hour=Math.floor((r.t/3600000)%24),start=C.utc_start_hour,end=C.utc_end_hour;
  check('UTC session',start===end?true:(start<end?(hour>=start&&hour<end):(hour>=start||hour<end)));
  check('entry family',C.entry_family==='DIP'?(f.drawdown<=C.drawdown_gate&&f.vwap<=C.vwap_deviation_gate):C.entry_family==='TREND'?(f.pump>0&&f.vwap>0):C.entry_family==='RANGE'?(f.vwap<0&&f.rsi<50):false);
  const sh=r.q>0?r.buy/r.q:0,ps=b[i-1].q>0?b[i-1].buy/b[i-1].q:0;
  check('buy share',sh>=C.min_buy_share);check('buy delta',sh-ps>=C.min_buy_share_delta);check('candle return',r.c/r.o-1>=C.min_green_candle_return);
  check('volume',f.volume>=C.min_volume_ratio_20m);check('flow',f.flow>=C.min_buy_flow_mean);check('flow slope',f.slope>=C.min_buy_flow_slope);
  for(const [k,lo,hi] of [
    ['pump','min_pump_return','max_pump_return'],['rsi','min_rsi','max_rsi'],['atr','min_atr_ratio','max_atr_ratio'],
    ['btc','min_btc_return','max_btc_return'],['sol','min_sol_return','max_sol_return'],['rebound','min_rebound_from_low','max_rebound_from_low'],
    ['intensity','min_trade_intensity','max_trade_intensity'],['size','min_average_trade_size_ratio','max_average_trade_size_ratio'],
    ['cvd','min_cvd_ratio','max_cvd_ratio'],['volatility','min_realized_volatility','max_realized_volatility'],
    ['efficiency','min_path_efficiency','max_path_efficiency'],['illiquidity','min_illiquidity_ratio','max_illiquidity_ratio']
  ])range(k,lo,hi);
  check('relative btc',f.pump-f.btc>=C.min_relative_btc_return&&f.pump-f.btc<=C.max_relative_btc_return);check('btc context rule',C.btc_context_rule==='ANY');
  check('relative sol',f.pump-f.sol>=C.min_relative_sol_return&&f.pump-f.sol<=C.max_relative_sol_return);check('sol context rule',C.sol_context_rule==='ANY');
  check('finite indicators',Object.values(f).every(Number.isFinite));return failed;
}
const netReturn=(entry,exit)=>exit*(1-C.fee_rate)/(entry*(1+C.fee_rate))-1;
const priceForNet=(entry,net)=>entry*(1+C.fee_rate)*(1+net)/(1-C.fee_rate);

function runV7(b){
  const P=precompute(b);
  const s={phase:'CASH',balance:1000,mark:1000,last:-1,fills:0,closed:0,wins:0,day:-1,dayCount:0,lastEntry:null};
  const counts={readyMinutes:0,filterMatchMinutes:0,availableSignals:0,ordersPlaced:0,fills:0,closed:0,expiredOrders:0,capacityOrCooldownRejects:0,blockedByStateFilterMatches:0,blockedByFrequencyFilterMatches:0};
  const signals=[],events=[],trades=[];let currentTrade=null,peakMark=1000,maxDd=0,firstReady=null,lastReady=null;
  const canEnter=t=>{const timeOk=s.lastEntry==null||s.lastEntry+C.min_hours_between_entries*3600000<=t;const day=Math.floor(t/86400000);const dayOk=C.max_entries_per_utc_day<=0||day!==s.day||s.dayCount<C.max_entries_per_utc_day;return timeOk&&dayOk;};
  const sell=(bar,price,reason)=>{const net=netReturn(s.entry,price),before=s.balance;s.balance=before*(1+net);s.mark=s.balance;s.phase='CASH';s.closed++;if(net>0)s.wins++;s.reason=reason;const ev={type:'SELL',time:bar.t,entryTime:s.entryTime,entry:s.entry,price,net,profit:before*net,balance:s.balance,reason};events.push(ev);counts.closed++;currentTrade.exitTime=bar.t;currentTrade.exitPrice=price;currentTrade.net=net;currentTrade.reason=reason;trades.push(currentTrade);currentTrade=null;peakMark=Math.max(peakMark,s.balance);maxDd=Math.min(maxDd,s.balance/peakMark-1);return ev;};
  const manage=(bar,shock)=>{const sameBar=bar.t===s.entryTime;if(s.macroPending)return sell(bar,bar.o*(1-C.adverse_slippage),'MACRO_SHOCK');if(s.phase==='POSITION'){if(!sameBar&&bar.o>=s.target)return sell(bar,s.target,'TP');if(bar.l<=s.stop){const base=sameBar?s.stop:Math.min(s.stop,bar.o);return sell(bar,base*(1-C.adverse_slippage),'STOP_MARKET');}if(!sameBar&&bar.h>s.target)return sell(bar,s.target,'TP');}const liquidation=bar.c*(1-C.adverse_slippage);s.mark=s.balance*(1+netReturn(s.entry,liquidation));peakMark=Math.max(peakMark,s.mark);maxDd=Math.min(maxDd,s.mark/peakMark-1);if(bar.t>=s.entryTime+C.max_hold_minutes*MIN)return sell(bar,liquidation,'TIME');if(s.phase==='POSITION'){const highest=Math.max(s.highest,sameBar?bar.c:bar.h);s.highest=highest;let stop=s.stop;if(C.breakeven_trigger_net>0&&highest>=priceForNet(s.entry,C.breakeven_trigger_net))stop=Math.max(stop,priceForNet(s.entry,0));if(C.trailing_stop_fraction>0)stop=Math.max(stop,highest*(1-C.trailing_stop_fraction));s.stop=stop;}s.macroPending=shock;return null;};

  for(let i=0;i<b.length;i++){
    const bar=b[i];if(P.runLen[i]<REQUIRED)continue;if(firstReady==null)firstReady=bar.t;lastReady=bar.t;
    const inWindow=bar.t>=START&&bar.t<END;if(inWindow)counts.readyMinutes++;
    let f=null,reasons=[];if(inWindow){f=calculate(b,i,P);reasons=rejectionReasons(b,i,f);}
    const entrySignal=inWindow&&reasons.length===0;if(entrySignal)counts.filterMatchMinutes++;
    const shock=C.macro_shock_rule==='BTC'&&i>=C.macro_shock_window_minutes&&bar.btc/b[i-C.macro_shock_window_minutes].btc-1<=C.btc_shock_threshold;
    const phaseStart=s.phase;s.last=bar.t;let event=null,available=false;
    if(s.phase==='LIMIT_PENDING'){
      if(bar.t>s.expires){s.phase='CASH';counts.expiredOrders++;}
      else if(bar.t>=s.earliest&&bar.l<s.limit&&bar.q>0){
        if(!canEnter(bar.t)||s.balance>bar.q*.01){s.phase='CASH';s.reason='CAPACITY_OR_COOLDOWN';counts.capacityOrCooldownRejects++;if(entrySignal)counts.blockedByStateFilterMatches++;continue;}
        const entry=Math.min(s.limit,bar.o),day=Math.floor(bar.t/86400000);s.dayCount=day===s.day?s.dayCount+1:1;s.day=day;
        Object.assign(s,{phase:'POSITION',entry,entryTime:bar.t,lastEntry:bar.t,target:priceForNet(entry,C.target_net),stop:priceForNet(entry,C.stop_net),highest:entry,macroPending:false});
        s.fills++;counts.fills++;currentTrade={signalTime:s.signalTime,entryTime:bar.t,entryPrice:entry,limit:s.limit};event=manage(bar,shock);if(!event){event={type:'BUY',time:bar.t,price:entry};events.push(event);}
      }
    }
    if(!event&&s.phase==='POSITION')event=manage(bar,shock);
    if(!event&&s.phase==='CASH'&&entrySignal){
      if(canEnter(bar.t+MIN)){available=true;counts.availableSignals++;const earliest=bar.t+MIN*(1+C.entry_latency_minutes);Object.assign(s,{phase:'LIMIT_PENDING',signalTime:bar.t,limit:bar.c*(1-C.limit_discount),earliest,expires:earliest+MIN*(C.limit_ttl_minutes-1)});counts.ordersPlaced++;event={type:'SIGNAL',time:bar.t,limit:s.limit};events.push(event);}else counts.blockedByFrequencyFilterMatches++;
    }else if(entrySignal&&phaseStart!=='CASH')counts.blockedByStateFilterMatches++;
    if(entrySignal)signals.push({time:bar.t,iso:new Date(bar.t).toISOString(),phaseStart,available,orderPlaced:event?.type==='SIGNAL',pump720:f.pump,btc30:f.btc,sol1:f.sol,btcShock3:bar.btc/b[i-C.macro_shock_window_minutes].btc-1,limit:event?.type==='SIGNAL'?event.limit:null});
    if(bar.t>=END&&s.phase==='CASH')break;
  }
  const gains=trades.filter(t=>t.net>0).reduce((a,t)=>a+t.net,0),losses=-trades.filter(t=>t.net<0).reduce((a,t)=>a+t.net,0);
  return{firstReady,lastReady,counts,summary:{fills:s.fills,closed:s.closed,wins:s.wins,winRate:s.closed?s.wins/s.closed:0,averageNet:s.closed?trades.reduce((a,t)=>a+t.net,0)/s.closed:0,profitFactor:losses?gains/losses:null,compound:s.balance/1000-1,maxMarkToMarketDrawdown:maxDd,exits:Object.fromEntries(['TP','STOP_MARKET','TIME','MACRO_SHOCK'].map(k=>[k,trades.filter(t=>t.reason===k).length]))},signals,trades};
}

console.log(`candidate=${spec.id} config_sha=${spec.config_sha256}`);console.log(`window=${new Date(START).toISOString()}..${new Date(END).toISOString()}`);
const rawPump=await fetchKlines('PUMPUSDT'),rawBtc=await fetchKlines('BTCUSDT'),rawSol=await fetchKlines('SOLUSDT');
const btcMap=new Map(rawBtc.map(r=>[+r[0],+r[4]])),solMap=new Map(rawSol.map(r=>[+r[0],+r[4]])),bars=parsePump(rawPump,btcMap,solMap);
let syncMissing=0,gaps=0;for(let i=0;i<bars.length;i++){if(!Number.isFinite(bars[i].btc)||!Number.isFinite(bars[i].sol))syncMissing++;if(i&&bars[i].t-bars[i-1].t!==MIN)gaps++;}
const data={requested:{start:new Date(START).toISOString(),end:new Date(END).toISOString(),fetchStart:new Date(FETCH_START).toISOString(),fetchEnd:new Date(FETCH_END).toISOString()},hashes:{PUMPUSDT:shaRaw(rawPump),BTCUSDT:shaRaw(rawBtc),SOLUSDT:shaRaw(rawSol),hashDefinition:'SHA256 of newline-delimited JSON.stringify(raw Binance kline arrays), in returned chronological order'},rows:{PUMPUSDT:rawPump.length,BTCUSDT:rawBtc.length,SOLUSDT:rawSol.length},firstLast:{PUMPUSDT:[rawPump[0]?.[0]??null,rawPump.at(-1)?.[0]??null],BTCUSDT:[rawBtc[0]?.[0]??null,rawBtc.at(-1)?.[0]??null],SOLUSDT:[rawSol[0]?.[0]??null,rawSol.at(-1)?.[0]??null]},synchronization:{missingBtcOrSolAtPumpTimestamps:syncMissing,pumpTimestampGaps:gaps}};
const result=runV7(bars);
const out={provenance:{candidate:spec.id,config_sha256:spec.config_sha256,semantics:'Android V7 Kotlin port from PUMP_BEST_DIP_FULL_FOR_AI.md',cadence:'every closed 1-minute bar',executionNotes:['strict Low < LIMIT','earliest next minute','TTL exactly 60 minutes','entry=min(limit,open)','same-bar TP forbidden; same-bar stop allowed','STOP before intrabar TP','new trailing stop applies next bar','BTC shock sets pending exit for next bar open','client_cancel_latency_minutes ignored','capacity balance <=1% quote volume'],featureNotes:['quote-volume-weighted typical-price VWAP','simple RSI/ATR, not Wilder','ratio features use current / mean(previous window)','synchronized PUMP/BTC/SOL closes']},data,result};
fs.writeFileSync(outArg,JSON.stringify(out,null,2));console.log(JSON.stringify({data,result:{firstReady:result.firstReady,lastReady:result.lastReady,counts:result.counts,summary:result.summary}},null,2));
