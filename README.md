# PUMP Pulse Web

Mobile-first PUMP/EUR investment research assistant and six-month strategy backtest.

Production site: https://pump-pulse-market.serano.chatgpt.site

## Features

- Live PUMP/EUR market pulse from closed 30-minute candles
- Strict and active strategy profiles
- Activity, flow, agreement and late-entry protection
- Personalized starting capital, entry fee, exit fee and slippage
- Automatic six-month historical test with trade cards and chart markers
- English, German and Turkish interface
- Private contact form on the production deployment
- Responsive layout designed for phones first and expanded for desktop

## Important

PUMP Pulse is an experimental research assistant. It does not place orders, does not provide financial advice and does not guarantee future returns.

The Android project `pump-paper-bot-android` is a separate reference implementation. This repository contains only the new web project.

## Local preview

Serve the repository root with any static web server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

The public contact endpoint is supplied by the production hosting worker and is not available in a plain static preview.
