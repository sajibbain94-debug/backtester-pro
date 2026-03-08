# BacktesterPro

> A professional, production-grade manual & automated backtesting platform built with React, Vite, and HTML5 Canvas. Features real market data integration, a 60fps canvas rendering engine, and TradingView-style UX.

[![Deploy to GitHub Pages](https://github.com/YOUR_USERNAME/backtester-pro/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/backtester-pro/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Live Demo

**[https://YOUR_USERNAME.github.io/backtester-pro](https://YOUR_USERNAME.github.io/backtester-pro)**

---

## System Architecture

```
backtester-pro/
├── src/
│   ├── components/          # Pure React UI layer
│   │   ├── ChartCanvas.jsx  # Canvas mount + interaction handler
│   │   ├── SubPanel.jsx     # RSI / MACD sub-chart panels
│   │   ├── Toolbar.jsx      # Top navigation bar
│   │   ├── ReplayBar.jsx    # Replay controls
│   │   ├── DrawingToolbar.jsx
│   │   ├── OrderPanel.jsx   # Trade execution UI
│   │   ├── Journal.jsx      # Trade history table
│   │   ├── Metrics.jsx      # Performance statistics
│   │   ├── OpenPositions.jsx
│   │   └── ContextMenu.jsx  # Right-click context menu
│   │
│   ├── engine/              # Canvas rendering engine (zero React dependency)
│   │   ├── chartRenderer.js # Main OHLCV chart renderer
│   │   └── subPanelRenderer.js # RSI/MACD panel renderers
│   │
│   ├── services/            # Data access layer
│   │   ├── dataService.js   # Unified data proxy (Strategy + Cache-aside)
│   │   ├── cache.js         # localStorage TTL cache
│   │   └── providers/
│   │       ├── finnhub.js        # Finnhub REST adapter
│   │       └── alphaVantage.js   # Alpha Vantage REST adapter
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useMarketData.js # Data fetching lifecycle
│   │   ├── useReplay.js     # Replay state machine
│   │   └── useIndicators.js # Memoised indicator calculations
│   │
│   ├── store/
│   │   └── index.js         # Zustand global state (persisted)
│   │
│   └── utils/
│       ├── constants.js     # Shared config & design tokens
│       ├── format.js        # Price/date formatters
│       └── mockGenerator.js # Synthetic OHLCV fallback
│
├── .github/workflows/
│   └── deploy.yml           # CI/CD → GitHub Pages
├── vite.config.js           # Dynamic base path + dev proxy
├── tailwind.config.js       # TradingView design token extension
└── .env.example             # API key documentation
```

---

## Design Patterns

### 1. Strategy + Proxy Pattern — Data Service

`dataService.js` implements a classic **Proxy** pattern with an embedded **Strategy** pattern for provider selection:

```
fetchBars(symbol, timeframe)
    │
    ├── Cache-aside check  (localStorage, TTL=60min)
    │       └─ HIT → return immediately
    │
    ├── Strategy dispatch  (by asset class)
    │       ├─ Forex     → FinnhubStrategy → AlphaVantageStrategy
    │       ├─ Crypto    → FinnhubStrategy → AlphaVantageStrategy
    │       ├─ Commodity → FinnhubStrategy
    │       └─ Index     → FinnhubStrategy
    │
    └── Mock fallback  (geometric Brownian motion generator)
```

This architecture means the application is **provider-agnostic**: swap in any data source by implementing a single `fetch(symbol, timeframe, from, to) → OHLCVBar[]` interface.

### 2. Separation of Rendering from React

`ChartRenderer` is a pure ES class with zero React dependency. This is the key architectural decision that enables 60fps rendering:

- **React renders once** when props change (layout, config)
- **Canvas renders continuously** driven by mouse events and interval timers
- No React reconciler overhead in the hot render path

The `ChartCanvas` component acts purely as a **lifecycle bridge**: it mounts the renderer on a `useEffect`, attaches DOM event listeners, and calls `renderer.render()` imperatively.

### 3. Immutable State via Immer

Zustand + Immer provides Redux-style **predictable state updates** without boilerplate. The `persist` middleware serialises the session to localStorage on every update, giving seamless session recovery on page refresh.

### 4. Custom Hooks as Domain Services

Each hook encapsulates a specific domain concern:
- `useMarketData` — async data lifecycle (loading/error/success states, abort controller)
- `useReplay` — finite state machine (idle → paused → playing → finished)
- `useIndicators` — pure computation memoised with `useMemo`, recalculates only when bars/config change

---

## Technical Indicators Implemented

| Indicator | Algorithm |
|-----------|-----------|
| EMA(n)    | Wilder's exponential smoothing, seeded with SMA |
| SMA(n)    | Rolling window average |
| RSI(14)   | Wilder's RSI with proper smoothing (not simple) |
| MACD(12,26,9) | EMA difference + signal EMA + histogram |
| Bollinger Bands(20,2) | SMA ± 2σ rolling standard deviation |
| ATR(14)   | Wilder's Average True Range (used for position sizing) |

All indicator functions in `useIndicators.js` are **pure functions** with no side effects. They are exported individually for use in non-React contexts (e.g., strategy backtesting scripts).

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Local Development

```bash
git clone https://github.com/YOUR_USERNAME/backtester-pro
cd backtester-pro
npm install
cp .env.example .env.local
# Edit .env.local with your API keys (optional — mock data works without keys)
npm run dev
```

App runs at **http://localhost:5173**

### API Keys (Optional)

The app works fully offline with synthetic data. For real market data:

1. **Finnhub** (recommended, 60 req/min free): [finnhub.io](https://finnhub.io/)
   ```
   VITE_FINNHUB_API_KEY=your_key
   ```

2. **Alpha Vantage** (25 req/day free): [alphavantage.co](https://www.alphavantage.co/support/#api-key)
   ```
   VITE_ALPHA_VANTAGE_API_KEY=your_key
   ```

### Production Build

```bash
npm run build
# Output: dist/
```

### Deploy to GitHub Pages

1. Fork / clone this repo
2. In GitHub repo → **Settings → Pages**: set source to **GitHub Actions**
3. In **Settings → Secrets → Actions**, add:
   - `VITE_FINNHUB_API_KEY`
   - `VITE_ALPHA_VANTAGE_API_KEY`
4. Push to `main` → GitHub Actions builds and deploys automatically

---

## Features

### Charting Engine
- HTML5 Canvas-based OHLCV candlestick chart
- Mouse-wheel zoom (0.15× to 6× scale)
- Click-drag pan with momentum
- Crosshair with OHLCV tooltip
- Right-click context menu

### Drawing Tools
- Trendlines (two-point)
- Horizontal levels (single-click)
- Fibonacci retracement levels (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%)
- Rectangle regions

### Indicators
- RSI(14) with overbought/oversold shading
- MACD(12,26,9) with histogram colouring
- Bollinger Bands(20,2)
- EMA 9 / 21 / 50 / 200

### Bar Replay Engine
- Adjustable playback speed (0.1s – 2.0s per bar)
- Step forward / backward one bar
- Set start point, jump to live
- Progress bar

### Trading Journal
- Full execution log (entry, exit, SL, TP, lot size, P&L, R:R)
- Session persisted to localStorage
- Win/Loss/Open status badges

### Performance Metrics
- Net P&L, Win Rate, Profit Factor
- Maximum Drawdown
- Average R:R ratio
- Gross Profit / Gross Loss
- Consecutive win/loss streaks

### Demo Account
- Configurable balance, leverage (1:1 → 1:500), commission
- Margin and risk calculation per trade
- Account reset without page refresh

### Asset Universe
| Class | Instruments |
|-------|-------------|
| Forex | EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, NZD/USD, EUR/GBP, EUR/JPY, GBP/JPY |
| Crypto | BTC, ETH, BNB, XRP, SOL, ADA, DOGE, MATIC, DOT, LTC |
| Commodities | XAU/USD (Gold), XAG/USD (Silver), WTI/USD (Oil) |
| Indices | SPX500, US30, NAS100, GER40 |

---

## Performance Considerations

| Concern | Solution |
|---------|----------|
| 60fps canvas | Renderer is a plain ES class, never re-instantiated |
| Large datasets | Only visible bars are rendered (virtual windowing) |
| API rate limits | localStorage cache with configurable TTL |
| State thrashing | Zustand selectors minimise re-renders per component |
| Bundle size | Vite code-splits vendor chunks (React, Zustand) |

---

## License

MIT — see [LICENSE](LICENSE)
