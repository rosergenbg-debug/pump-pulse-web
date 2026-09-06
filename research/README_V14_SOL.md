# V14 SOL out-of-sample research

This branch is research-only. Production/main is unchanged.

Goal: replay candidate V14-90b41cc55ee1c848 on SOLUSDT for February 2026 without SOL-specific parameter fitting.

Known frozen execution parameters from the original research discussion:
- limit entry 2.5% below signal price;
- order TTL 1 hour;
- target +5% NET;
- stop -15% NET;
- max hold 7 days;
- move protection near breakeven after roughly +3%;
- minimum 18h between entries;
- protective exit if BTC drops 3% in 3 minutes.

The exact entry-filter implementation must be recovered from repository history or identified as an approximation before interpreting results.
