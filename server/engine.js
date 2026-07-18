const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));

function ema(values, period) {
  if (!values.length) return [];
  const k = 2 / (period + 1), out = [];
  let value = values[0];
  values.forEach((next, index) => {
    value = index ? next * k + value * (1 - k) : next;
    out.push(value);
  });
  return out;
}

function rsi(values, period = 14) {
  const out = Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    gain += Math.max(diff, 0); loss += Math.max(-diff, 0);
  }
  gain /= period; loss /= period;
  out[period] = loss ? 100 - 100 / (1 + gain / loss) : 100;
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(diff, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-diff, 0)) / period;
    out[i] = loss ? 100 - 100 / (1 + gain / loss) : 100;
  }
  return out;
}

function candleReturn(candles, index, bars) {
  return index >= bars && candles[index - bars].close ? candles[index].close / candles[index - bars].close - 1 : 0;
}

function synthEur(pump, eur) {
  const rates = new Map(eur.map(c => [c.closeTime, c]));
  return pump.map(p => {
    const e = rates.get(p.closeTime);
    return e ? {...p, open:p.open/e.open, high:p.high/e.low, low:p.low/e.high, close:p.close/e.close} : null;
  }).filter(Boolean);
}

function indicators(pump, btc, sol) {
  const closes = pump.map(x => x.close), e20 = ema(closes, 20), e200 = ema(closes, 200), rs = rsi(closes);
  const btcE200 = ema(btc.map(x => x.close), 200), btcE50 = ema(btc.map(x => x.close), 50);
  const btcBy = new Map(btc.map((x, i) => [x.closeTime, {...x, i}]));
  const solBy = new Map(sol.map(x => [x.closeTime, x]));
  const volumeRatio = [], drawdown = [], shockCount = [], breakout = [], spotFlow = [], atr = [];
  for (let i = 0; i < pump.length; i++) {
    const window = pump.slice(Math.max(0, i - 19), i + 1).map(x => x.volume).sort((a,b) => a-b);
    const median = window.length >= 20 ? (window[9] + window[10]) / 2 : window.reduce((a,b) => a+b, 0) / Math.max(1, window.length);
    volumeRatio[i] = median ? pump[i].volume / median : 0;
    const high36h = Math.max(...pump.slice(Math.max(0, i - 71), i + 1).map(x => x.high));
    drawdown[i] = pump[i].close / high36h - 1;
    shockCount[i] = Array.from({length:Math.min(36, i + 1)}, (_,k) => candleReturn(pump, i-k, 1)).filter(x => x <= -.02).length;
    breakout[i] = i >= 6 && pump[i].close >= Math.max(...pump.slice(i-6, i).map(x => x.high));
    const flow = pump.slice(Math.max(0, i-2), i+1);
    spotFlow[i] = flow.length === 3 ? flow.reduce((a,x) => a + (x.volume ? 2*x.taker/x.volume - 1 : 0), 0) / 3 : null;
    const ranges = [];
    for (let j=Math.max(1,i-13);j<=i;j++) ranges.push(Math.max(pump[j].high-pump[j].low,Math.abs(pump[j].high-pump[j-1].close),Math.abs(pump[j].low-pump[j-1].close)));
    atr[i] = ranges.length === 14 ? ranges.reduce((a,b)=>a+b,0)/14/pump[i].close : null;
  }
  return {e20,e200,rs,volumeRatio,drawdown,shockCount,breakout,spotFlow,atr,btcBy,solBy,btcE200,btcE50,
    btcAbove(i){const b=btcBy.get(pump[i].closeTime);return !!b&&b.close>btcE200[b.i]},
    btcSlope(i){const b=btcBy.get(pump[i].closeTime);return !!b&&b.i>=6&&btcE50[b.i]>btcE50[b.i-6]},
    market(i){if(i<6)return null;const b1=btcBy.get(pump[i].closeTime),b0=btcBy.get(pump[i-6].closeTime),s1=solBy.get(pump[i].closeTime),s0=solBy.get(pump[i-6].closeTime);return b1&&b0&&s1&&s0?((b1.close/b0.close-1)+(s1.close/s0.close-1))/2:null}
  };
}

function lateRisk(pump, ind, i) {
  if (i < 48) return 0;
  const w=pump.slice(i-47,i+1),lo=Math.min(...w.map(x=>x.low)),hi=Math.max(...w.map(x=>x.high));
  const location=(pump[i].close-lo)/Math.max(1e-12,hi-lo), rr=ind.rs[i]||50;
  return Math.round(clamp(100*(.30*clamp((location-.5)/.5,0,1)+.20*clamp((rr-50)/18,0,1)+.20*clamp(candleReturn(pump,i,6)/.07,0,1)+.15*clamp(candleReturn(pump,i,2)/.04,0,1)+.15*clamp((pump[i].close/ind.e20[i]-1)/.035,0,1))));
}

function signalAt(pump, ind, i, profile) {
  if (i < 236) return {mode:"NONE",readiness:0,stages:0,late:0,blocked:false,reason:"History"};
  const c=pump[i],prev=pump[i-1],r=ind.rs[i]||0,rp=ind.rs[i-1]||0,extension=c.close/ind.e200[i]-1;
  const noChase=candleReturn(pump,i,1)<.04&&candleReturn(pump,i,6)<.08&&extension<=.035, priceReady=extension>=0&&extension<=.035;
  let trendArmed=false;for(let j=i-23;j<=i;j++)if((ind.rs[j]??100)<=40)trendArmed=true;
  const trend=trendArmed&&r>=45&&r<=55&&rp<45&&priceReady&&ind.btcAbove(i)&&ind.btcSlope(i)&&noChase;
  let shockArmed=false;for(let j=i-35;j<=i;j++)if(candleReturn(pump,j,1)<=-.03&&ind.volumeRatio[j]>=3&&(ind.rs[j]??100)<=40)shockArmed=true;
  const prevExtension=prev.close/ind.e200[i-1]-1;
  const shock=shockArmed&&r>=45&&r<=55&&priceReady&&!(rp>=45&&rp<=55&&prevExtension>=0&&prevExtension<=.035)&&ind.btcAbove(i)&&noChase;
  let exhaustionArmed=false;for(let j=i-11;j<=i;j++)if(ind.drawdown[j]<=-.06&&ind.shockCount[j]>=3)exhaustionArmed=true;
  const confirm=(c.close>=ind.e20[i]&&prev.close<ind.e20[i-1])||(ind.breakout[i]&&r>=55&&rp<55), flow=(ind.spotFlow[i]??-1)>=0;
  const market=(ind.market(i)??-1)>=-.02&&(ind.atr[i]??0)>=.007&&(ind.atr[i]??1)<=.035, limit=profile==="active"?-.03:-.06;
  const exhaustion=exhaustionArmed&&confirm&&r>=43&&r<=58&&flow&&market&&ind.drawdown[i]<=limit;
  const stages=[exhaustionArmed,confirm,flow,market].filter(Boolean).length,late=lateRisk(pump,ind,i);
  const blocked=late>=(profile==="active"?70:60)&&(trend||shock||exhaustion), mode=blocked?"NONE":exhaustion?"EXHAUSTION":shock?"SHOCK":trend?"TREND":"NONE";
  const readiness=mode!=="NONE"?100:blocked?70:Math.min(98,stages*22+(trendArmed||shockArmed?10:0));
  return {mode,readiness,stages,late,blocked,reason:mode==="TREND"?"RSI recovery and trend confirmation":mode==="SHOCK"?"Recovery after a high-volume shock":mode==="EXHAUSTION"?"Exhaustion, reversal and buyer flow confirmed":blocked?"Late-entry protection":"Waiting for the next complete setup"};
}

function percentile(value, values) { return 100*values.filter(x=>x<=value).length/Math.max(1,values.length); }

function liveSnapshot(history) {
  const {pump,btc,sol}=history, ind=indicators(pump,btc,sol), i=pump.length-1, variants={};
  for (const profile of ["strict","active"]) variants[profile]=signalAt(pump,ind,i,profile);
  const hours=[];for(let j=Math.max(2,i-999);j<=i;j+=2)hours.push(Math.abs(candleReturn(pump,j,2)));
  const energy=Math.round(percentile(Math.abs(candleReturn(pump,i,2)),hours));
  const flow=Math.round(clamp(100*(.55*Math.tanh(candleReturn(pump,i,2)/.018)+.25*Math.tanh(candleReturn(pump,i,6)/.035)+.2*(ind.spotFlow[i]||0)),-100,100));
  const agreement=Math.round(clamp(45+Math.abs(flow)*.3+variants.strict.stages*6));
  let breathing="transition";if(variants.strict.late>=65&&flow>10)breathing="lateMove";else if(energy>=65&&flow>=18)breathing="upward";else if(energy>=65&&flow<=-18)breathing="downward";else if(energy<=35&&Math.abs(flow)<=20)breathing="calm";
  const start=Math.max(0,pump.length-120), chart=[];for(let x=start;x<pump.length;x++)chart.push([pump[x].closeTime,pump[x].close,ind.e20[x]]);
  return {updatedAt:Date.now(),candleTime:pump[i].closeTime,price:pump[i].close,change24:candleReturn(pump,i,48)*100,energy,flow,agreement,breathing,rsi:ind.rs[i]||0,drawdown:ind.drawdown[i]*100,variants,chart};
}

function runStrategy(history, settings, profile) {
  const {pump,btc,sol}=history,ind=indicators(pump,btc,sol);let cash=settings.capital,coins=0,totalFees=0,stops=0,wins=0,rounds=0,equity=[cash],events=[],connections=[],cool=-1;
  for(let i=236;i<pump.length-2;i++){
    if(i<cool)continue;const sig=signalAt(pump,ind,i,profile);if(sig.mode==="NONE")continue;
    const entryIndex=i+1,entry=pump[entryIndex],initial=cash,entryPrice=entry.open*(1+settings.slippage),buyFee=cash*settings.buyFee;totalFees+=buyFee;coins=(cash-buyFee)/entryPrice;cash=0;events.push({type:"BUY",time:entry.openTime,price:entryPrice});
    const maxHold=sig.mode==="EXHAUSTION"?96:48,first=sig.mode==="EXHAUSTION"?.07:sig.mode==="SHOCK"?.06:.08,partial=sig.mode==="EXHAUSTION"?.4:sig.mode==="SHOCK"?.5:1;
    let partialTaken=false,highest=entryPrice,partialText="",exitIndex=Math.min(entryIndex+maxHold+1,pump.length-1),exitReason=sig.mode==="EXHAUSTION"?"48-hour limit":"24-hour limit";
    for(let j=entryIndex;j<=Math.min(entryIndex+maxHold,pump.length-2);j++){
      const c=pump[j],exec=pump[j+1],stop=entryPrice*(1-.044);equity.push(cash+coins*c.low*(1-settings.slippage)*(1-settings.sellFee));
      if(!partialTaken&&c.low<=stop){exitIndex=j+1;exitReason="Protective stop −4.4%";stops++;break}
      if(!partialTaken&&c.high>=entryPrice*(1+first)){
        const price=exec.open*(1-settings.slippage);if(partial>=.999){exitIndex=j+1;exitReason="Trend target +8%";break}
        const sold=coins*partial,gross=sold*price,fee=gross*settings.sellFee;cash+=gross-fee;totalFees+=fee;coins-=sold;partialTaken=true;highest=Math.max(c.high,exec.open,entryPrice*(1+first));partialText=`${Math.round(partial*100)}% at +${Math.round(first*100)}%`;j++;continue;
      }
      if(partialTaken){const floor=sig.mode==="EXHAUSTION"?entryPrice*1.004:entryPrice,trail=Math.max(floor,highest*(1-.04));if(c.low<=trail){exitIndex=j+1;exitReason="Remainder trailing stop 4%";break}if(sig.mode==="EXHAUSTION"&&c.high>=entryPrice*1.14){exitIndex=j+1;exitReason="Remainder target +14%";break}highest=Math.max(highest,c.high)}
    }
    const exit=pump[exitIndex],exitPrice=exit.open*(1-settings.slippage),gross=coins*exitPrice,exitFee=gross*settings.sellFee;cash+=gross-exitFee;totalFees+=exitFee;coins=0;
    const pnl=cash-initial,pct=pnl/initial*100;events.push({type:"SELL",time:exit.openTime,price:exitPrice});connections.push({entry:{time:entry.openTime,price:entryPrice,reason:sig.reason},exit:{time:exit.openTime,price:exitPrice,reason:exitReason},partial:partialText,pnl,pct,duration:exit.openTime-entry.openTime,mode:sig.mode});rounds++;if(pnl>=0)wins++;else if(sig.mode==="EXHAUSTION")cool=exitIndex+12;equity.push(cash);i=exitIndex;
  }
  let peak=equity[0],dd=0;for(const value of equity){peak=Math.max(peak,value);dd=Math.min(dd,value/peak-1)}
  const chart=[],step=Math.max(1,Math.ceil(pump.length/750));for(let i=0;i<pump.length;i+=step)chart.push([pump[i].closeTime,pump[i].close,ind.e20[i]]);if(chart.at(-1)?.[0]!==pump.at(-1).closeTime)chart.push([pump.at(-1).closeTime,pump.at(-1).close,ind.e20.at(-1)]);
  return {updatedAt:Date.now(),from:pump[0].openTime,to:pump.at(-1).closeTime,settings,profile,equity:cash,profit:cash-settings.capital,profitPct:(cash/settings.capital-1)*100,rounds,wins,winRate:rounds?wins/rounds*100:0,maxDd:dd*100,totalFees,stops,events,connections,chart};
}
