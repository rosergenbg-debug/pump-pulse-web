# V14 cross-market replay on volatility-matched WIF

Research-only. `main` unchanged.

## Market selection

Period: 2026-02-01 through 2026-08-01, 30-minute Binance spot candles.

Candidates compared with PUMPUSDT: WIF, BONK, PEPE, DOGE, FLOKI, SHIB.

Distance metric uses the log-ratio distance across:
- mean absolute 30m return;
- p90 absolute 30m return;
- p99 absolute 30m return;
- RMS 30m return;
- p90 candle range;
- frequency of >=2% 30m moves;
- frequency of >=4% 30m moves.

Closest candidate: **WIFUSDT**, distance to PUMP **0.20187**. Next closest: BONK **0.43118**, PEPE **0.56877**.

WIF volatility profile over the six-month window:
- mean abs 30m return: 0.5136%
- p90 abs 30m return: 1.1236%
- p99 abs 30m return: 2.6138%
- RMS 30m return: 0.7629%
- p90 30m candle range: 1.9048%
- >=2% 30m move frequency: 2.2217%
- >=4% 30m move frequency: 0.1612%

## Frozen reconstructed V14 replay

Same execution/risk package as the prior SOL test, no WIF-specific tuning:
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

Results:
- signals: **43**
- expired limits: **39**
- filled trades: **4**
- winners: **3**
- win rate: **75.0%**
- average NET per filled trade: **+2.507%**
- profit factor: **3.017**
- compounded result: **+10.007%**
- max drawdown: **-4.972%**
- exits: **3 TP / 0 STOP / 0 BE / 0 BTC emergency / 1 TIME**

Trade NET outcomes: +5%, +5%, +5%, -4.972%.

## Interpretation

Unlike SOL, WIF is volatile enough that the reconstructed V14 signal followed by a -2.5% one-hour limit sometimes fills. The first volatility-matched transfer test is positive, but the evidence is still extremely small: only four filled trades in six months. It is therefore a promising cross-market observation, not evidence of a robust profitable strategy.

The exact hash-specific entry filter set for `V14-90b41cc55ee1c848` remains missing from committed history; this is the closest reproducible V14 filter-family reconstruction, not an exact hash replay.

GitHub Actions run: `34084366547`.
Artifact: `10004725122` / `v14-crossmarket-research`.
Artifact digest: `sha256:a4bd713ab6d79384ab94de6cb38b36a5198004b62fbba97bb7d603d99c0294d4`.
