import fs from 'fs';

const spec=JSON.parse(fs.readFileSync('research/PUMP_BEST_DIP_EXACT.json','utf8'));
const C=spec.config;
const START=Date.parse('2026-02-01T00:00:00Z');
const END=Date.parse('2026-08-01T00:00:00Z');
const warm=Math.max(C.vwap_window_minutes,C.drawdown_window_minutes,C.micro_window_minutes,C.pump_return_window_minutes,C.structure_window_minutes)+120;
const tail=C.max_hold_minutes+C.limit_ttl_minutes+120;
const FETCH_START=START-warm*60000, FETCH_END=END+tail*60000;
const SYMBOLS=['PUMPUSDT','WIFUSDT','BONKUSDT','SOLUSDT'];
const API='https://data-api.binance.vision/api/v3/klines';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function klines(symbol,start=FETCH_START,end=FETCH_END){
  const out=[];let cursor=start;
  while(cursor<end){
    const u=new URL(API);u.searchParams.set('symbol',symbol);u.searchParams.set('interval','1m');u.searchParams.set('startTime',String(cursor));u.searchParams.set('endTime',String(end-1));u.searchParams.set('limit','1000');
    const r=await fetch(u,{headers:{'user-agent':'PUMP-V13-90b41-exact-config-research'}});if(!r.ok)throw new Error(`${symbol} HTTP ${r.status}`);
    const rows=await r.json();if(!rows.length)break;
    for(const x of rows)out.push({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],ct:+x[6],q:+x[7],n:+x[8],tbq:+x[10]});
    const next=+rows.at(-1)[6]+1;if(next<=cursor)break;cursor=next;await sleep(8);
  }
  return out;
}
const pref=(a,fn)=>{const p=new Float64Array(a.length+1);for(let i=0;i<a.length;i++)p[i+1]=p[i]+fn(a[i],i);return p};
const sum=(p,i,w)=>{const a=Math.max(0,i-w+1);return p[i+1]-p[a]};
const avg=(p,i,w)=>sum(p,i,w)/Math.min(w,i+1);
function rsi(vals,p){const o=new Float64Array(vals.length);o.fill(NaN);let g=0,l=0;for(let i=1;i<vals.length;i++){const d=vals[i]-vals[i-1],gg=Math.max(d,0),ll=Math.max(-d,0);if(i<=p){g+=gg;l+=ll;if(i===p){g/=p;l/=p}}else{g=(g*(p-1)+gg)/p;l=(l*(p-1)+ll)/p}if(i>=p)o[i]=l?100-100/(1+g/l):100}return o}
function rollingExtreme(a,w,key,isMax){const o=new Float64Array(a.length),dq=[];for(let i=0;i<a.length;i++){while(dq.length&&dq[0]<i-w+1)dq.shift();while(dq.length&&(isMax?a[dq.at(-1)][key]<=a[i][key]:a[dq.at(-1)][key]>=a[i][key]))dq.pop();dq.push(i);o[i]=a[dq[0]][key]}return o}
function atrRatio(a,p){const tr=new Float64Array(a.length);for(let i=0;i<a.length;i++){const pc=i?a[i-1].c:a[i].o;tr[i]=Math.max(a[i].h-a[i].l,Math.abs(a[i].h-pc),Math.abs(a[i].l-pc))}const pr=pref([...tr],x=>x);const o=new Float64Array(a.length);o.fill(NaN);for(let i=p-1;i<a.length;i++)o[i]=avg(pr,i,p)/a[i].c;return o}
function makeCtx(rows){const idx=new Map(rows.map((x,i)=>[x.t,i]));return{rows,idx,ret(t,w){const i=idx.get(t);if(i==null||i<w)return NaN;return rows[i].c/rows[i-w].c-1},close(t){const i=idx.get(t);return i==null?NaN:rows[i].c}}}
function features(a,btc,sol){
  const ret=new Float64Array(a.length),logr=new Float64Array(a.length),abslog=new Float64Array(a.length),sqlog=new Float64Array(a.length),signedQ=new Float64Array(a.length),ami=new Float64Array(a.length);
  for(let i=1;i<a.length;i++){ret[i]=a[i].c/a[i-1].c-1;logr[i]=Math.log(a[i].c/a[i-1].c);abslog[i]=Math.abs(logr[i]);sqlog[i]=logr[i]*logr[i];signedQ[i]=2*a[i].tbq-a[i].q;ami[i]=Math.abs(ret[i])/Math.max(a[i].q,1e-12)}
  const pv=pref(a,x=>x.q),bv=pref(a,x=>x.v),qv=pref(a,x=>x.q),tb=pref(a,x=>x.tbq),cnt=pref(a,x=>x.n),sg=pref([...signedQ],x=>x),lg=pref([...logr],x=>x),al=pref([...abslog],x=>x),sq=pref([...sqlog],x=>x),am=pref([...ami],x=>x);
  const maxH=rollingExtreme(a,C.drawdown_window_minutes,'h',true),minL=rollingExtreme(a,C.structure_window_minutes,'l',false),R=rsi(a.map(x=>x.c),C.rsi_period_minutes),ATR=atrRatio(a,C.atr_period_minutes);
  const signal=new Uint8Array(a.length);const reject={};const rej=k=>reject[k]=(reject[k]||0)+1;
  for(let i=warm;i<a.length;i++){
    const x=a[i];if(x.t<START||x.t>=END)continue;const hour=new Date(x.t).getUTCHours();
    let ok=true;const gate=(cond,name)=>{if(ok&&!cond){rej(name);ok=false}};
    const vwap=sum(pv,i,C.vwap_window_minutes)/Math.max(sum(bv,i,C.vwap_window_minutes),1e-12);
    const dd=x.c/maxH[i]-1,dev=x.c/vwap-1,cRet=x.c/x.o-1;
    const vol20=avg(qv,i,20)/Math.max(avg(qv,i,C.volume_window_minutes),1e-12);
    const pRet=i>=C.pump_return_window_minutes?x.c/a[i-C.pump_return_window_minutes].c-1:NaN;
    const buyShare=x.q?x.tbq/x.q:0,prevShare=a[i-1].q?a[i-1].tbq/a[i-1].q:0;
    const br=x.c/minL[i]-1;
    const bfQ=sum(qv,i,C.buy_flow_window_minutes),bfMean=bfQ?sum(sg,i,C.buy_flow_window_minutes)/bfQ:0;
    const half=Math.max(1,Math.floor(C.buy_flow_window_minutes/2));const q1=sum(qv,i,half),q0=i>=half?sum(qv,i-half,half):0;const f1=q1?sum(sg,i,half)/q1:0,f0=q0?sum(sg,i-half,half)/q0:0,bfSlope=f1-f0;
    const mw=C.micro_window_minutes,mq=sum(qv,i,mw),mc=sum(cnt,i,mw),q20=sum(qv,i,20),c20=sum(cnt,i,20);
    const intensity=(c20/20)/Math.max(mc/Math.min(mw,i+1),1e-12);
    const avgSizeRatio=(q20/Math.max(c20,1))/(mq/Math.max(mc,1));
    const cvd=mq?sum(sg,i,mw)/mq:0,rv=Math.sqrt(Math.max(0,sum(sq,i,mw))),eff=sum(al,i,mw)?Math.abs(sum(lg,i,mw))/sum(al,i,mw):0;
    const ill=avg(am,i,20)/Math.max(avg(am,i,mw),1e-18);
    const bRet=btc.ret(x.t,C.btc_return_window_minutes),sRet=sol.ret(x.t,C.sol_return_window_minutes);
    const bRel=pRet-btc.ret(x.t,C.pump_return_window_minutes),sRel=pRet-sol.ret(x.t,C.pump_return_window_minutes);
    gate(hour>=C.utc_start_hour&&hour<C.utc_end_hour,'utc');gate(dd<=C.drawdown_gate,'drawdown');gate(dev<=C.vwap_deviation_gate,'vwap');
    gate(buyShare>=C.min_buy_share,'buyShare');gate(buyShare-prevShare>=C.min_buy_share_delta,'buyShareDelta');gate(cRet>=C.min_green_candle_return,'candleReturn');gate(vol20>=C.min_volume_ratio_20m,'volume');
    gate(pRet>=C.min_pump_return&&pRet<=C.max_pump_return,'assetReturn');gate(R[i]>=C.min_rsi&&R[i]<=C.max_rsi,'rsi');gate(ATR[i]>=C.min_atr_ratio&&ATR[i]<=C.max_atr_ratio,'atr');
    gate(bRet>=C.min_btc_return&&bRet<=C.max_btc_return,'btcReturn');gate(sRet>=C.min_sol_return&&sRet<=C.max_sol_return,'solReturn');gate(br>=C.min_rebound_from_low&&br<=C.max_rebound_from_low,'rebound');
    gate(bfMean>=C.min_buy_flow_mean&&bfSlope>=C.min_buy_flow_slope,'buyFlow');gate(bRel>=C.min_relative_btc_return&&bRel<=C.max_relative_btc_return,'relBTC');gate(sRel>=C.min_relative_sol_return&&sRel<=C.max_relative_sol_return,'relSOL');
    gate(intensity>=C.min_trade_intensity&&intensity<=C.max_trade_intensity,'intensity');gate(avgSizeRatio>=C.min_average_trade_size_ratio&&avgSizeRatio<=C.max_average_trade_size_ratio,'avgTradeSize');gate(cvd>=C.min_cvd_ratio&&cvd<=C.max_cvd_ratio,'cvd');
    gate(rv>=C.min_realized_volatility&&rv<=C.max_realized_volatility,'realizedVol');gate(eff>=C.min_path_efficiency&&eff<=C.max_path_efficiency,'pathEfficiency');gate(ill>=C.min_illiquidity_ratio&&ill<=C.max_illiquidity_ratio,'illiquidity');
    if(ok)signal[i]=1;
  }
  return{signal,reject};
}
function replay(symbol,a,btcCtx,solCtx){
  const F=features(a,btcCtx,solCtx),fee=C.execution_fee_rate??C.fee_rate;let signals=0;for(const s of F.signal)signals+=s;
  let capital=1000,closedPeak=1000,closedDd=0,markPeak=1000,markDd=0,lastEntry=-Infinity,day='',dayEntries=0,expired=0,eligible=0,wins=0;const trades=[],exits={TP:0,STOP_MARKET:0,TRAIL:0,BTC_SHOCK:0,TIME:0};
  for(let i=warm;i<a.length;i++){
    const x=a[i];if(x.t<START||x.t>=END)continue;if(!F.signal[i])continue;
    const d=new Date(x.t).toISOString().slice(0,10);if(d!==day){day=d;dayEntries=0}if(dayEntries>=C.max_entries_per_utc_day||x.t-lastEntry<C.min_hours_between_entries*3600000)continue;eligible++;
    const limit=x.c*(1-C.limit_discount);let fi=-1;const first=i+1+C.entry_latency_minutes,last=Math.min(a.length-1,i+C.limit_ttl_minutes+C.client_cancel_latency_minutes);
    for(let j=first;j<=last;j++){if(a[j].l<=limit){fi=j;break}}if(fi<0){expired++;continue}
    dayEntries++;lastEntry=a[fi].t;const entryCost=limit*(1+fee+C.spread_rate/2),tp=entryCost*(1+C.target_net)/(1-fee-C.spread_rate/2),st=entryCost*(1+C.stop_net)/(1-fee-C.spread_rate/2),be=entryCost/(1-fee-C.spread_rate/2);
    let armed=false,peakPx=limit,reason='TIME',ei=Math.min(a.length-1,fi+C.max_hold_minutes),exitPx=a[ei].c*(1-C.adverse_slippage);
    for(let j=fi;j<=ei;j++){
      const c=a[j];peakPx=Math.max(peakPx,c.h);if(c.h*(1-fee)/entryCost-1>=C.breakeven_trigger_net)armed=true;
      const mtm=capital*(c.c*(1-fee)/entryCost);markPeak=Math.max(markPeak,mtm);markDd=Math.min(markDd,mtm/markPeak-1);
      if(c.l<=st){reason='STOP_MARKET';exitPx=st*(1-C.adverse_slippage);ei=j;break}
      if(c.h>=tp){reason='TP';exitPx=tp;ei=j;break}
      const bNow=btcCtx.close(c.t),bOld=btcCtx.close(c.t-C.macro_shock_window_minutes*60000);if(C.macro_shock_rule==='BTC'&&Number.isFinite(bNow)&&Number.isFinite(bOld)&&bNow/bOld-1<=C.btc_shock_threshold){reason='BTC_SHOCK';exitPx=c.c*(1-C.adverse_slippage);ei=j;break}
      if(armed){const trail=Math.max(be,peakPx*(1-C.trailing_stop_fraction));if(c.l<=trail){reason='TRAIL';exitPx=trail*(1-C.adverse_slippage);ei=j;break}}
    }
    const net=exitPx*(1-fee-C.spread_rate/2)/entryCost-1;capital*=1+net;closedPeak=Math.max(closedPeak,capital);closedDd=Math.min(closedDd,capital/closedPeak-1);markPeak=Math.max(markPeak,capital);markDd=Math.min(markDd,capital/markPeak-1);if(net>0)wins++;exits[reason]++;trades.push({entryTime:a[fi].t,exitTime:a[ei].ct,netPct:net*100,reason});i=ei;
  }
  const gains=trades.filter(t=>t.netPct>0).reduce((s,t)=>s+t.netPct,0),loss=-trades.filter(t=>t.netPct<0).reduce((s,t)=>s+t.netPct,0),sorted=trades.map(t=>t.netPct/100).sort((x,y)=>x-y),k=Math.max(1,Math.ceil(sorted.length*.05)),cvar=sorted.length?sorted.slice(0,k).reduce((s,x)=>s+x,0)/k:null;
  return{symbol,signals,eligibleOrders:eligible,expired,fills:trades.length,wins,winRate:trades.length?wins/trades.length*100:0,averageNetPct:trades.length?trades.reduce((s,t)=>s+t.netPct,0)/trades.length:0,profitFactor:loss?gains/loss:null,compoundPct:(capital/1000-1)*100,maxMarkToMarketDrawdownPct:markDd*100,closedTradeDrawdownPct:closedDd*100,cvar5:cvar,exits,trades,rejectionCounts:F.reject};
}

console.log(`config=${spec.id} sha=${spec.config_sha256}`);console.log(`window=${new Date(START).toISOString()}..${new Date(END).toISOString()} 1m`);
const btcRows=await klines('BTCUSDT'),solRows=await klines('SOLUSDT'),btc=makeCtx(btcRows),sol=makeCtx(solRows);const results={};
for(const s of SYMBOLS){const rows=s==='SOLUSDT'?solRows:await klines(s);console.log(`${s} rows=${rows.length}`);results[s]=replay(s,rows,btc,sol);console.log(JSON.stringify(results[s],null,2));}
const out={provenance:{config_id:spec.id,config_sha256:spec.config_sha256,source_file:'research/PUMP_BEST_DIP_EXACT.json',window:{start:new Date(START).toISOString(),end:new Date(END).toISOString()},resolution:'1m',note:'Literal config-driven replay. Native optimizer source is not committed; feature definitions are documented in the script and results must be distinguished from the JSON embedded ground-truth metrics.'},embeddedMetrics:spec.metrics,results};fs.writeFileSync('v13_exact_90b41_crossmarket_result.json',JSON.stringify(out,null,2));
