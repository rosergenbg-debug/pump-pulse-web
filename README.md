# PUMP Pulse Web

Mobile-first PUMP/EUR investment research assistant and six-month strategy backtest.

Production site: https://pump-pulse-market.serano.chatgpt.site

## Features

- Server-prepared PUMP/EUR market pulse from closed 30-minute candles
- Strict and active strategy profiles
- Activity, flow, agreement and late-entry protection
- Personalized starting capital, entry fee, exit fee and slippage
- Server-side six-month historical test with cached market history
- English, German and Turkish interface
- Private contact form on the production deployment
- Responsive layout designed for phones first and expanded for desktop

## Important

PUMP Pulse is an experimental research assistant. It does not place orders, does not provide financial advice and does not guarantee future returns.

The Android project `pump-paper-bot-android` is a separate reference implementation. This repository contains only the new web project.

The bundled 30-minute research history is refreshed from Binance market data during deployment. The public worker keeps the live PUMP/EUR snapshot warm through a separate current-market feed, so a visitor receives a prepared result even when an upstream API is temporarily unavailable.

## Local preview

Build and validate the hosting worker:

```bash
npm run refresh-history
npm run build
npm run validate
```

`refresh-history` creates the bundled six-month dataset required by the server build. Run it again before each production deployment.

The live market, backtest, private contact form and author inbox are supplied by the production worker and its database.
