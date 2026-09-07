# V13-90b41cc55ee1c848 — PUMP 2025 out-of-sample replay

Research-only. `main` unchanged.

## Frozen candidate

- ID: `V13-90b41cc55ee1c848`
- SHA-256: `90b41cc55ee1c8483d78a8d774add3fb9d24169ed215d2c5e1ded3b0bb432572`
- Source: `research/PUMP_BEST_DIP_EXACT.json`
- No parameter tuning for 2025
- Same preferred reconstruction as the cross-market test: Binance 1m features, decisions every 15 minutes
- Fee 0.21% each side
- Limit entry -2.5%, TTL 60m (+1m client cancel latency)
- Target +5% NET
- Stop -15% NET
- Max hold 7 days
- Minimum 18h between entries, max 3/day
- BE/trailing protection after +3% NET excursion
- BTC macro shock -3% / 3m

## Intended window and actual usable history

Requested replay window: `2025-08-01T00:00:00Z` through `2026-01-01T00:00:00Z`.

Binance Spot did not yet have PUMP/USDT in August 2025. PUMP/USDT spot trading opened on 2025-09-11 12:30 UTC. With the candidate's 7-day VWAP warm-up, the first valid decision region begins roughly one week later. The first filled trade in this replay is 2025-09-19.

The downloader returned 170,790 PUMPUSDT one-minute rows, consistent with the later listing rather than a full August-December history.

## Overall OOS result

| Metric | Result |
|---|---:|
| Signals | 1,046 |
| Eligible orders | 498 |
| Expired limits | 472 |
| Filled trades | 26 |
| Winning trades | 13 |
| Win rate | 50.00% |
| Average NET / trade | -1.5752% |
| Profit factor | 0.6135 |
| Compound return | **-40.1761%** |
| Max mark-to-market drawdown | **-42.0690%** |
| Closed-trade drawdown | -41.9581% |
| TP exits | 13 |
| STOP_MARKET exits | 7 |
| TRAIL exits | 6 |
| TIME exits | 0 |
| BTC_SHOCK exits | 0 |

## Monthly breakdown by entry month

| Month | Trades | Wins | WR | Compound | Avg NET | PF | Exits |
|---|---:|---:|---:|---:|---:|---:|---|
| 2025-09 | 6 | 3 | 50.0% | -1.8378% | -0.0380% | 0.9850 | 3 TP / 1 STOP / 2 TRAIL |
| 2025-10 | 8 | 5 | 62.5% | -8.0098% | -0.6520% | 0.8274 | 5 TP / 2 STOP / 1 TRAIL |
| 2025-11 | 9 | 5 | 55.6% | -8.0834% | -0.5884% | 0.8252 | 5 TP / 2 STOP / 2 TRAIL |
| 2025-12 | 3 | 0 | 0.0% | -27.9233% | -10.0720% | 0.0000 | 0 TP / 2 STOP / 1 TRAIL |

October through December alone combine to roughly -39.06%, so the failure is not explained only by the immediate post-listing September period.

## Interpretation

This is a materially negative out-of-sample result for the frozen candidate in the preferred reconstruction. The 2025 replay does **not** support the idea that the selected +88%/+96% embedded optimizer results generalize unchanged backward in time.

The key problem is the asymmetric payoff: seven -15% stops overwhelm thirteen +5% target wins and several near-break-even trailing exits. A 50% headline win rate is therefore economically poor.

This is evidence of regime dependence and/or optimizer overfitting. It does not prove the strategy has no edge, because the original optimizer/backtest source is still unavailable and the 15-minute decision cadence remains a reconstruction inferred from signal-count matching. But any claim that `V13-90b41...` is robustly profitable should now be considered unsubstantiated until the native engine can reproduce both the embedded metrics and this OOS comparison.

## Reproducibility

GitHub Actions run: `34117470437`
Artifact: `10016885318` / `v13-90b41-pump-oos-2025`
Artifact digest: `sha256:89f8d812d624dd2843e63a7b15fec0529c7f6de57ac9c94f807bb9339e84eb68`
