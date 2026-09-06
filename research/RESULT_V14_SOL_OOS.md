# V14-90b41cc55ee1c848 — SOL cross-market replay

Status: research-only. `main` unchanged.

## Important provenance caveat

The exact hashed entry-filter set for `V14-90b41cc55ee1c848` is not present in the committed repository. This replay therefore uses the closest reproducible V14 `signalAt` filter reconstruction from the historical `pump-pulse-web` engine, while keeping the candidate execution/risk parameters from the Work discussion unchanged.

Frozen execution/risk parameters:
- limit entry 2.5% below signal close;
- TTL 60 minutes;
- +5% NET target;
- -15% NET stop;
- protection moved near NET breakeven after about +3% NET excursion;
- max hold 7 days;
- minimum 18h between entries;
- BTC emergency exit after -3% in 3 minutes;
- 0.21% fee each side;
- 0.08% adverse slippage on market/protective exits.

## SOLUSDT February 2026

- V14 signals: **4**
- expired limit entries: **4**
- filled trades: **0**
- result: **0%** because no position was opened

## SOLUSDT six-month extension — 2026-02-01 through 2026-08-01

No parameters were changed; only the sample window was enlarged.

- V14 signals: **27**
- expired limit entries: **27**
- filled trades: **0**
- result: **0%** because no position was opened

GitHub Actions run: `34060447551`.
Artifact: `9997300907` / `v14-sol-oos-replays`.
Artifact digest: `sha256:87b25fd0f0a292bd1caa3fd4cccbc961806f4399bc2649e9aad0e06f819c9977`.

## Interpretation

With the recoverable V14 filter, the execution rule `signal -> limit 2.5% lower, TTL 1h` does not transfer mechanically to SOL: none of the generated SOL signals retraced enough within the one-hour order lifetime to produce a fill, even over six months.

This does **not** prove that the exact hashed candidate `V14-90b41cc55ee1c848` would also produce zero SOL trades, because its exact hashed entry-filter configuration is missing from the committed repository. It does show that the missing filter configuration is essential: the candidate cannot be independently reproduced from its exit/risk parameters alone.
