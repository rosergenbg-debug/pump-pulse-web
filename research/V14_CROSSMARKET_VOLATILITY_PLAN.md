# V14 volatility-matched cross-market test

Research branch only; `main` unchanged.

Goal: avoid choosing a comparison coin by reputation. Measure six-month 30-minute volatility for PUMPUSDT and several liquid meme coins over 2026-02-01 through 2026-08-01, rank by distance to PUMP across mean absolute return, p90/p99 absolute return, RMS return, p90 candle range, and frequencies of >=2% and >=4% 30-minute moves. Then apply the same frozen reconstructed V14 execution/risk package to the closest candidate with no parameter tuning.

Candidates: WIF, BONK, PEPE, DOGE, FLOKI, SHIB.

V14 package remains: limit -2.5% / TTL 1h / +5% NET TP / -15% NET stop / BE protection after ~+3% / max hold 7d / 18h cooldown / BTC -3% in 3m emergency exit / 0.21% fees per side / adverse slippage on protective market exits.

Caveat: exact hash-specific entry filters for V14-90b41cc55ee1c848 are not committed; this uses the closest recoverable V14 signal-family reconstruction.