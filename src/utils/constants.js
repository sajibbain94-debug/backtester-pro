// ─── Timeframes ───────────────────────────────────────────────────────────────
export const TIMEFRAMES = ['1m','3m','5m','15m','30m','1h','4h','1d','1w']
export const TF_MINUTES  = { '1m':1,'3m':3,'5m':5,'15m':15,'30m':30,'1h':60,'4h':240,'1d':1440,'1w':10080 }

// ─── Assets ───────────────────────────────────────────────────────────────────
export const ASSETS = {
  Forex:       ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','USD/CHF','NZD/USD','EUR/GBP','EUR/JPY','GBP/JPY'],
  Crypto:      ['BTC/USD','ETH/USD','BNB/USD','XRP/USD','SOL/USD','ADA/USD','DOGE/USD','MATIC/USD','DOT/USD','LTC/USD'],
  Commodities: ['XAU/USD','XAG/USD','WTI/USD'],
  Indices:     ['SPX500','US30','NAS100','GER40'],
}

// All symbols flat
export const ALL_SYMBOLS = Object.values(ASSETS).flat()

// ─── Chart colours ────────────────────────────────────────────────────────────
export const C = {
  bg:       '#131722',
  panel:    '#1e2130',
  border:   '#2a2e39',
  hover:    '#2a2e39',
  text:     '#d1d4dc',
  muted:    '#787b86',
  dim:      '#4a4f61',
  green:    '#26a69a',
  red:      '#ef5350',
  blue:     '#2962ff',
  yellow:   '#f59e0b',
  purple:   '#a855f7',
  orange:   '#f97316',
  cyan:     '#22d3ee',
}

// ─── EMA colours ──────────────────────────────────────────────────────────────
export const EMA_COLORS = {
  ema9:   '#f59e0b',
  ema21:  '#a855f7',
  ema50:  '#22d3ee',
  ema200: '#f97316',
}

// ─── Drawing tools ────────────────────────────────────────────────────────────
export const TOOLS = [
  { id: 'cursor',    icon: '⊹', label: 'Select'          },
  { id: 'cross',     icon: '✛', label: 'Crosshair'       },
  { id: 'trendline', icon: '╱', label: 'Trendline'       },
  { id: 'hline',     icon: '—', label: 'Horizontal Line' },
  { id: 'fib',       icon: '≈', label: 'Fibonacci'       },
  { id: 'rect',      icon: '□', label: 'Rectangle'       },
]

// ─── Default indicator config ─────────────────────────────────────────────────
export const DEFAULT_INDICATORS = {
  rsi:    true,
  macd:   true,
  bb:     false,
  ema9:   false,
  ema21:  false,
  ema50:  true,
  ema200: false,
}

// ─── Default account ──────────────────────────────────────────────────────────
export const DEFAULT_ACCOUNT = {
  balance:    10000,
  leverage:   100,
  commission: 0.0001,
}

// ─── Cache TTL (ms) ───────────────────────────────────────────────────────────
export const CACHE_TTL_MS = (Number(import.meta.env.VITE_CACHE_TTL_MINUTES) || 60) * 60 * 1000
