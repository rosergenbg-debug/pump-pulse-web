# V13-90b41cc55ee1c848 — Android V7 semantic replay correction

Research-only. `main` unchanged.

## Why this report exists

Earlier independent replays used a reconstructed engine and made several unsupported or incorrect assumptions, most importantly a 15-minute decision cadence inferred from signal-count similarity. The user then supplied `PUMP_BEST_DIP_FULL_FOR_AI.md`, which contains the actual Android V7 Kotlin feature formulas, execution state machine, and synchronized PUMP/BTC/SOL runtime rules.

This report supersedes the earlier reconstructed-engine performance claims for purposes of evaluating **Android V7 semantics**. It does **not** claim bit-for-bit equivalence with the historical desktop/Python optimizer, whose exact source, trade logs, window dates, and source-candle hashes remain unavailable.

## Frozen candidate

- Candidate: `V13-90b41cc55ee1c848`
- Config SHA-256: `90b41cc55ee1c8483d78a8d774add3fb9d24169ed215d2c5e1ded3b0bb432572`
- No parameter tuning between tests.

## Android V7 rules implemented

Feature semantics were ported from the supplied Kotlin:

- every closed 1-minute bar; no artificial 15-minute cadence;
- synchronized PUMPUSDT/BTCUSDT/SOLUSDT timestamps;
- 10,080 contiguous synchronized minutes required;
- quote-volume-weighted **typical-price VWAP**: `sum(((H+L+C)/3)*quoteVolume)/sum(quoteVolume)`;
- simple 7-change RSI, not Wilder;
- simple 14-TR ATR / close, not Wilder;
- ratio features use current value divided by the mean of the previous window;
- flow is average taker-buy share, with slope versus the previous non-overlapping window;
- exact numerical BTC/SOL filters remain active even though context rule is `ANY`.

Execution semantics:

- only `CASH` can place a limit order;
- LIMIT = signal close × 0.975;
- earliest fill is next minute;
- TTL is exactly 60 candidate minutes; `client_cancel_latency_minutes` is ignored for V7;
- fill requires **Low < LIMIT**, not `<=`;
- entry price = `min(LIMIT, Open)`;
- balance must not exceed 1% of fill-minute quote volume;
- frequency checks occur at both placement and fill according to the V7 state machine;
- same-bar TP on the limit-fill candle is forbidden; same-bar stop is allowed;
- known TP at open is checked before stop; otherwise STOP has priority over intrabar TP;
- trailing/break-even stop updates after risk checks and becomes effective on the next bar;
- BTC shock sets `macroPending`; exit happens on the **next bar open** with adverse slippage;
- TIME/STOP/MACRO use 0.08% adverse slippage.

## Instrumentation

The new replay logs and counts separately:

1. ready synchronized minutes;
2. raw filter-match minutes;
3. available signals after state/frequency constraints;
4. orders placed;
5. fills;
6. closed trades;
7. expired orders;
8. capacity/cooldown fill rejects;
9. filter matches blocked by an existing order/position;
10. filter matches blocked by frequency limits.

For every raw filter-match minute the artifact records:

- PUMP return 720m;
- BTC return 30m;
- SOL return 1m;
- BTC shock return 3m;
- phase at start of bar;
- whether it was available and whether an order was placed.

Raw Binance kline arrays are also SHA-256 hashed using newline-delimited `JSON.stringify(rawKlineArray)` in chronological return order.

---

# Test A — PUMP 2025 backward OOS-style window

Requested signal window: `2025-08-01T00:00:00Z` to `2026-01-01T00:00:00Z`.

PUMPUSDT did not exist on Binance Spot in August. The downloaded PUMP series begins at **2025-09-11 12:30 UTC**. The first minute satisfying the full 10,080-minute synchronized warm-up is **2025-09-18 12:29 UTC**.

### Data integrity

- PUMP rows: `170,680`
- BTC rows: `240,555`
- SOL rows: `240,555`
- missing BTC/SOL timestamps at PUMP timestamps: `0`
- PUMP timestamp gaps: `0`

SHA-256:

- PUMPUSDT: `3c99e78a30f680ea9606ba1a5eadae79c7ba535c6c236bc7cde97e33f7cd143e`
- BTCUSDT: `972f9c8ccacdc688bfde70fe45a16291ec8768dbd1f20a89c81e40cda37b8bae`
- SOLUSDT: `d538b448af37004d369d492b7b47571fa9655a5f101d9865bbfb587003b571c5`

### Signal/order funnel

- ready minutes: **150,451**
- raw filter-match minutes: **18,143**
- available signals: **556**
- orders placed: **556**
- expired orders: **511**
- capacity/cooldown fill rejects: **11**
- fills: **34**
- closed trades: **34**
- filter matches blocked by state: **15,540**
- filter matches blocked by frequency limits: **2,047**

This directly demonstrates why matching the archival signal count by forcing a 15-minute cadence was methodologically invalid: the strategy can match filters on many thousands of minutes while only a small subset becomes actionable signals because the state machine is occupied or frequency-blocked.

### Performance

- fills: **34**
- wins: **18**
- win rate: **52.94%**
- average NET/trade: **-1.3580%**
- Profit Factor: **0.6609**
- compound return: **-44.9678%**
- max mark-to-market drawdown: **-46.1668%**
- TP exits: **18**
- STOP_MARKET exits: **16**
- TIME: `0`
- MACRO_SHOCK: `0`

The 16 STOP_MARKET exits consist of:

- **9 full-stop losses** around `-15.068%` NET;
- **7 near-break-even/trailing-stop losses** around `-0.08%` NET.

### Monthly breakdown by entry month

| Month | Trades | Wins | WR | Compound | PF | Exit composition |
|---|---:|---:|---:|---:|---:|---|
| 2025-09 | 5 | 2 | 40.0% | -20.54% | 0.331 | 2 TP / 3 STOP |
| 2025-10 | 11 | 8 | 72.7% | +6.49% | 1.324 | 8 TP / 3 STOP |
| 2025-11 | 13 | 6 | 46.2% | -18.16% | 0.659 | 6 TP / 7 STOP |
| 2025-12 | 5 | 2 | 40.0% | -20.54% | 0.331 | 2 TP / 3 STOP |

October is positive under V7 semantics, unlike the earlier reconstruction, but the total period still fails because full -15% stops are too frequent.

---

# Test B — PUMP 2026-02-01 through 2026-08-01

Same frozen config and same V7 semantics.

### Data integrity

- PUMP rows: `280,875`
- BTC rows: `280,875`
- SOL rows: `280,875`
- missing BTC/SOL timestamps at PUMP timestamps: `0`
- PUMP timestamp gaps: `0`

SHA-256:

- PUMPUSDT: `43538ebf278bab29f9b4e6cdb70ac70d9e6eb0c7f10aaa8739146de694f01b65`
- BTCUSDT: `e1472cd65d5335a4a5932b1b0bdb3a42a4d8d6fa32a16115bf54c3db88c58e1c`
- SOLUSDT: `a12d39c55aee9fed755f7cdeaeb05a538cd207be22213ddac642f9701b46da39`

### Signal/order funnel

- ready minutes: **260,640**
- raw filter-match minutes: **21,632**
- available signals: **1,370**
- orders placed: **1,370**
- expired orders: **1,307**
- capacity/cooldown fill rejects: **45**
- fills: **18**
- closed trades: **18**
- filter matches blocked by state: **19,757**
- filter matches blocked by frequency limits: **505**

### Performance

- fills: **18**
- wins: **15**
- win rate: **83.33%**
- average NET/trade: **+3.3207%**
- Profit Factor: **4.9251**
- compound return: **+76.2851%**
- max mark-to-market drawdown: **-18.0577%**
- TP exits: **15**
- STOP_MARKET exits: **3**
- TIME: `0`
- MACRO_SHOCK: `0`

The three STOP_MARKET exits are:

- **1 full stop** around `-15.068%`;
- **2 near-break-even/trailing exits** around `-0.08%`.

### Monthly breakdown by entry month

| Month | Trades | Wins | WR | Compound | Exit composition |
|---|---:|---:|---:|---:|---|
| 2026-02 | 4 | 2 | 50.0% | -6.44% | 2 TP / 2 STOP |
| 2026-03 | 3 | 3 | 100% | +15.76% | 3 TP |
| 2026-04 | 1 | 1 | 100% | +5.00% | 1 TP |
| 2026-05 | 4 | 3 | 75.0% | +15.67% | 3 TP / 1 near-BE STOP |
| 2026-06 | 4 | 4 | 100% | +21.55% | 4 TP |
| 2026-07 | 2 | 2 | 100% | +10.25% | 2 TP |

---

# Correction versus earlier reconstructed results

Earlier reconstructed replay claims for this candidate should not be treated as Android V7 results.

Most important corrections:

1. **15-minute cadence removed.** V7 processes every closed minute.
2. **VWAP corrected** to quote-volume-weighted typical price.
3. **RSI/ATR corrected** to the exact simple rolling formulas.
4. **Flow, intensity, average-size and illiquidity formulas corrected** to Kotlin definitions.
5. **Pending orders now block subsequent signal placement until fill/expiry.**
6. **Strict `Low < LIMIT`** is used.
7. **TTL is exactly 60 minutes** and client cancel latency is not applied.
8. **Same-bar TP is forbidden.**
9. **Trailing stop updates apply on the next bar.**
10. **BTC shock exits on the next bar open.**
11. **Capacity constraint is enforced.**
12. **Frequency checks follow the V7 state machine.**

The previous reconstructed values of approximately **+17.77% for Feb-Aug 2026** and **-40.18% for 2025** are therefore superseded as Android V7 estimates.

Under the supplied Android V7 semantics, the corresponding results are approximately:

- **Feb-Aug 2026: +76.29%**
- **2025 usable post-listing period: -44.97%**

So the earlier reconstruction materially understated performance in the strong 2026 regime, while the negative 2025 risk signal remains and becomes slightly more negative.

---

# Interpretation

The corrected result changes the interpretation in an important way.

The algorithm is **not merely a weak +17% reconstruction** in 2026. Under the supplied V7 semantics it produces a very strong +76.3% over the Feb-Jul 2026 entry period, with 15/18 winning trades and only one full -15% stop.

At the same time, the same frozen config fails badly on the available 2025 post-listing history, where nine full stops overwhelm eighteen +5% targets.

This pattern is consistent with strong **regime dependence** and remains compatible with optimizer overfitting. It does not by itself distinguish a genuine regime-specific edge from a candidate selected to fit a favorable period.

The 2025 result should now be treated as a more credible Android-V7 risk result than the old -40% reconstruction, but it is still **not a reproduction of the historical desktop/Python optimizer**, because that desktop engine, exact source windows, source candles and original trade ledger are not available.

Likewise, the +76.3% Feb-Aug 2026 result should not automatically be labeled independent OOS unless it is established that this exact period was not used in the candidate-selection process.

## Next validation priority

Before further cross-market transfer, obtain or generate a trade ledger from the original desktop/V15 reference implementation on an agreed fixed candle set and compare:

- filter-match timestamps;
- actionable signal timestamps;
- limit placement and expiration timestamps;
- fill timestamps and prices;
- stop/TP/trailing transitions;
- exit timestamps, reasons and net returns.

Only after trade-level equivalence is established should portability or forward profitability be compared across engines.

## Reproducibility

Branch: `research/v13-v7-exact-replay`

Replay source: `tools/v13_v7_exact_replay.mjs`

GitHub Actions run: `34123692164`

Artifact: `10019340559` / `v13-v7-exact-replays`

Artifact ZIP digest: `sha256:8f50cdfa31cbd4b4dfbea8f1c4c716f6d328ae06a977135f64d5f03d427d71bf`

The artifact contains the full signal logs and full trade logs for both tested windows.
