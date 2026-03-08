/**
 * Finnhub API provider
 * Docs: https://finnhub.io/docs/api
 * Free tier: 60 calls / minute
 *
 * Normalises responses to the canonical OHLCVBar format:
 *   { time: number (ms), open, high, low, close, volume }
 */

const BASE = import.meta.env.DEV
  ? '/api/finnhub'                    // Vite dev proxy (avoids CORS)
  : 'https://finnhub.io/api/v1'       // Direct in production (or use own proxy)

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY ?? ''

/** Map our internal symbol format → Finnhub resolution strings */
const TF_MAP = {
  '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
  '1h': '60', '4h': '240', '1d': 'D', '1w': 'W',
}

/**
 * Map internal symbol → Finnhub symbol.
 * Finnhub uses different formats per asset class.
 */
function toFinnhubSymbol(symbol) {
  const map = {
    'EUR/USD': 'OANDA:EUR_USD',
    'GBP/USD': 'OANDA:GBP_USD',
    'USD/JPY': 'OANDA:USD_JPY',
    'AUD/USD': 'OANDA:AUD_USD',
    'USD/CAD': 'OANDA:USD_CAD',
    'USD/CHF': 'OANDA:USD_CHF',
    'NZD/USD': 'OANDA:NZD_USD',
    'EUR/GBP': 'OANDA:EUR_GBP',
    'EUR/JPY': 'OANDA:EUR_JPY',
    'GBP/JPY': 'OANDA:GBP_JPY',
    'XAU/USD': 'OANDA:XAU_USD',
    'XAG/USD': 'OANDA:XAG_USD',
    'WTI/USD': 'NYMEX:CL1!',
    'BTC/USD': 'BINANCE:BTCUSDT',
    'ETH/USD': 'BINANCE:ETHUSDT',
    'BNB/USD': 'BINANCE:BNBUSDT',
    'XRP/USD': 'BINANCE:XRPUSDT',
    'SOL/USD': 'BINANCE:SOLUSDT',
    'SPX500':  'CBOE:SPX',
    'US30':    'INDEX:DJI',
    'NAS100':  'NASDAQ:NDX',
  }
  return map[symbol] ?? symbol
}

/**
 * Fetch OHLCV bars from Finnhub /stock/candle endpoint.
 *
 * @param {string} symbol    - internal symbol, e.g. 'EUR/USD'
 * @param {string} timeframe - internal TF, e.g. '1h'
 * @param {number} from      - unix seconds
 * @param {number} to        - unix seconds
 * @returns {Promise<OHLCVBar[]>}
 */
export async function fetchFinnhub(symbol, timeframe, from, to) {
  if (!API_KEY) throw new Error('VITE_FINNHUB_API_KEY not set')

  const fsym = toFinnhubSymbol(symbol)
  const res  = TF_MAP[timeframe] ?? '60'

  // Choose correct endpoint: forex vs crypto vs stock
  let endpoint
  if (symbol.endsWith('/USD') && !['XAU/USD','XAG/USD','WTI/USD'].includes(symbol) && !['BTC/USD','ETH/USD','BNB/USD','XRP/USD','SOL/USD','ADA/USD','DOGE/USD'].includes(symbol)) {
    endpoint = `${BASE}/forex/candle?symbol=${fsym}&resolution=${res}&from=${from}&to=${to}&token=${API_KEY}`
  } else if (['BTC/USD','ETH/USD','BNB/USD','XRP/USD','SOL/USD','ADA/USD','DOGE/USD','MATIC/USD','DOT/USD','LTC/USD'].includes(symbol)) {
    endpoint = `${BASE}/crypto/candle?symbol=${fsym}&resolution=${res}&from=${from}&to=${to}&token=${API_KEY}`
  } else {
    endpoint = `${BASE}/stock/candle?symbol=${fsym}&resolution=${res}&from=${from}&to=${to}&token=${API_KEY}`
  }

  const response = await fetch(endpoint)
  if (!response.ok) throw new Error(`Finnhub HTTP ${response.status}`)
  const data = await response.json()

  if (data.s !== 'ok' || !data.t?.length) {
    throw new Error(`Finnhub: no data for ${symbol} (status=${data.s})`)
  }

  // Normalise to internal format
  return data.t.map((ts, i) => ({
    time:   ts * 1000,            // → milliseconds
    open:   data.o[i],
    high:   data.h[i],
    low:    data.l[i],
    close:  data.c[i],
    volume: data.v[i] ?? 0,
  }))
}
