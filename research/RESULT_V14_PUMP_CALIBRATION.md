# V14 PUMP calibration — same-span control

Research-only. `main` unchanged.

## Purpose

Calibrate the recoverable V14 reconstruction against PUMP itself before treating cross-market results as representative of the exact Work candidate `V14-90b41cc55ee1c848`.

Period: 2026-02-01 through 2026-08-01, Binance PUMPUSDT 30-minute spot candles.

Frozen execution/risk package, unchanged from prior SOL/WIF tests:
- recoverable V14 signal-family reconstruction;
- limit entry -2.5% from signal close;
- TTL 60m;
- target +5% NET;
- stop -15% NET;
- BE protection after about +3% NET excursion;
- max hold 7d;
- 18h minimum between entries;
- BTC emergency exit after -3% in 3m;
- fees 0.21% per side;
- 0.08% adverse slippage on protective market exits.

## Result on PUMPUSDT

- signals: **27**
- expired limits: **26**
- filled trades: **1**
- winners: **1**
- win rate: **100%**
- average NET per filled trade: **+5.0%**
- compounded result: **+5.0%**
- max drawdown: **0%**
- exits: **1 TP / 0 STOP / 0 BE / 0 BTC emergency / 0 TIME**

## Interpretation

This is a calibration failure relative to the Work description of `V14-90b41cc55ee1c848`, which reported substantially more completed trades and much larger compounded gains across its tested windows. Therefore the recoverable V14 `signalAt` reconstruction is not the exact hash-specific entry-filter configuration used by the Work candidate.

The prior WIF result (+10.007% from 4 filled trades) remains a valid experiment for this reconstructed V14 filter family, but it must not be presented as an exact cross-market replay of `V14-90b41cc55ee1c848`.

The missing entry-filter configuration is now demonstrated to be material, not merely a provenance detail.

GitHub Actions run: `34103932712`.
Artifact: `10011687704` / `v14-crossmarket-research`.
Artifact digest: `sha256:dd138fdc126b8f80126fff1d867e71ca6c2c7dd886b1a0670911e22af77ecbe2`.
