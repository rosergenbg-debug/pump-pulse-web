# Frozen reconstructed V14 — PUMP and BONK on the same six-month span

Research-only. `main` unchanged.

Period: **2026-02-01 through 2026-08-01**. Same reconstructed V14 filter family and same execution/risk package as the prior SOL/WIF tests. No symbol-specific tuning.

Frozen parameters include: limit entry -2.5% from signal close, TTL 60m, +5% NET target, -15% NET stop, BE protection after about +3% NET excursion, max hold 7d, 18h minimum between entries, BTC emergency exit after -3% in 3m, fees 0.21% per side, and 0.08% adverse slippage on protective market exits.

## PUMPUSDT

- signals: **27**
- expired limits: **26**
- filled trades: **1**
- winners: **1**
- win rate: **100%**
- average NET per filled trade: **+5.0%**
- compounded result: **+5.0%**
- max drawdown: **0%**
- exits: **1 TP / 0 STOP / 0 BE / 0 BTC emergency / 0 TIME**

Trade outcome: **+5%**.

## BONKUSDT

- signals: **38**
- expired limits: **35**
- filled trades: **3**
- winners: **2**
- win rate: **66.67%**
- average NET per filled trade: **+0.835%**
- profit factor: **1.334**
- compounded result: **+1.988%**
- max drawdown: **-7.494%**
- exits: **2 TP / 0 STOP / 0 BE / 0 BTC emergency / 1 TIME**

Trade outcomes: **+5%, +5%, -7.494%**.

## Comparison with WIF and SOL

- SOL: 27 signals, 0 fills, 0 trades.
- WIF: 43 signals, 4 fills, 3 winners, +10.007% compound.
- BONK: 38 signals, 3 fills, 2 winners, +1.988% compound.
- PUMP: 27 signals, 1 fill, 1 winner, +5.0% compound.

## Main interpretation

The BONK transfer is mildly positive, but the much more important finding is the PUMP control itself: this reconstructed filter family produces only one filled PUMP trade over six months. That is incompatible with the previously reported `V14-90b41cc55ee1c848` research windows containing many more filled trades (for example 14 trades in the strong sideways/rising composition and 41 trades in the falling section). Therefore the missing hash-specific entry-filter configuration is not a minor detail; it is essential to reproducing the original candidate.

These cross-market results are useful only as tests of the recoverable V14-family reconstruction. They should not be treated as exact performance of the original hashed candidate.

GitHub Actions run: `34104298625`.
Artifact: `10011864050` / `v14-crossmarket-research`.
Artifact digest: `sha256:3c3dbd30650f9d22f327142765c81a90eb28563e41892bd166357eb09490935b`.
