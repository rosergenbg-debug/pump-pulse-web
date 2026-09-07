# V13-90b41cc55ee1c848 exact-config cross-market replay

Research-only. `main` unchanged.

## Source candidate

Source file: `research/PUMP_BEST_DIP_EXACT.json` copied verbatim from the user-supplied `PUMP_BEST_DIP_EXACT.json`.

- candidate ID: `V13-90b41cc55ee1c848`
- config SHA-256: `90b41cc55ee1c8483d78a8d774add3fb9d24169ed215d2c5e1ded3b0bb432572`
- entry family: `DIP`
- fee: 0.21% per side
- limit entry: -2.5%
- limit TTL: 60m (+ 1m client cancel latency)
- target: +5% NET
- stop: -15% NET, STOP_MARKET
- max hold: 7d
- min 18h between entries; max 3 entries per UTC day
- BE/trailing protection after +3% NET excursion
- BTC macro shock rule: -3% / 3m

The file also includes the original embedded optimizer metrics for BEAR, SIDEWAYS and BULL. Those are ground-truth outputs of the original engine, not regenerated here.

## Important engine provenance caveat

The parameter file is complete, but the native optimizer/backtest source that defines every feature formula and decision cadence is not committed in the accessible repository. Therefore a bit-for-bit native replay is still impossible from the JSON alone.

A literal config-driven engine was implemented from the parameter names using Binance 1-minute spot data. Evaluating every minute produced far too many PUMP signals (16,989) compared with the embedded 180-day regime counts (1,104–1,353). Re-evaluating the same 1-minute features only every 15 minutes produced 1,132 PUMP signals over the six-month test window, closely matching the source engine's signal-count scale. The 15-minute decision cadence is therefore the preferred reconstruction, but remains an inference until the native optimizer source is recovered.

## Test window

2026-02-01 00:00 UTC through 2026-08-01 00:00 UTC, with sufficient warm-up for the 7-day VWAP and sufficient tail data for 7-day positions.

No symbol-specific tuning was performed. PUMP, WIF, BONK and SOL all used the same frozen candidate config.

## Preferred reconstruction: 1m features / 15m decision cadence

| Symbol | Signals | Fills | Wins | WR | Avg NET | PF | Compound | Max MTM DD | Exits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| PUMPUSDT | 1,132 | 18 | 11 | 61.11% | +1.128% | 1.585 | **+17.771%** | -31.760% | 11 TP / 2 STOP / 4 TRAIL / 1 TIME |
| WIFUSDT | 1,690 | 21 | 7 | 33.33% | -0.158% | 0.913 | **-6.629%** | -26.274% | 7 TP / 2 STOP / 10 TRAIL / 2 TIME |
| BONKUSDT | 1,622 | 12 | 2 | 16.67% | -5.963% | 0.123 | **-54.256%** | -61.170% | 2 TP / 5 STOP / 3 TRAIL / 2 TIME |
| SOLUSDT | 1,402 | 8 | 4 | 50.00% | -1.287% | 0.660 | **-12.460%** | -22.254% | 4 TP / 2 STOP / 2 TRAIL |

No BTC macro-shock exit fired in this window.

## Literal every-minute sensitivity run

The same config evaluated every minute instead of every 15 minutes produced:

- PUMP: 27 fills, 16 wins, WR 59.26%, compound +0.730%
- WIF: 34 fills, 10 wins, WR 29.41%, compound -3.101%
- BONK: 22 fills, 9 wins, WR 40.91%, compound -46.956%
- SOL: 13 fills, 6 wins, WR 46.15%, compound -21.665%

This sensitivity confirms that cadence materially changes the candidate's behavior.

## What this changes relative to the earlier reconstructed V14 tests

The earlier 30-minute `V14` family reconstruction was not this exact candidate. It used the wrong generation label and only a recoverable production-style filter family. Its cross-market outcomes (WIF about +10%, BONK about +2%, SOL no fills, PUMP one fill) are superseded for purposes of evaluating `90b41...`.

The exact parameter file identifies the candidate as **V13**, not V14, and contains many filters that were absent from the earlier reconstruction. The new 1m/15m replay is therefore the relevant cross-market test for the supplied config.

## Interpretation

On the common Feb–Aug 2026 window, the frozen candidate remains positive on its native PUMP market in the preferred reconstruction (+17.77%, PF 1.59, 61.1% WR), while it does not transfer profitably to WIF, BONK or SOL without retuning. BONK is especially poor despite being close to PUMP in coarse 30-minute volatility.

This argues that the candidate's edge, if real, is not explained by volatility alone. It appears more dependent on PUMP-specific interactions among the long VWAP/drawdown state, order-flow/microstructure gates, timing, and the -2.5% limit-fill pattern.

This is still not proof of a robust profitable strategy. The supplied JSON contains in-sample/selected optimizer metrics, and the native feature definitions and exact regime date ranges have not yet been recovered. A proper validation requires the native engine or independent unseen periods with the candidate frozen.

## Reproducibility

GitHub Actions run: `34110977032`
Artifact: `10014572875` / `v13-exact-90b41-crossmarket`
Artifact digest: `sha256:cb301c0ce1890e8f134e8147a97297790967a0e906c12da7aed800737b097e8a`
