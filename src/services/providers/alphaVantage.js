/**
 * Alpha Vantage API provider
 * Docs: https://www.alphavantage.co/documentation/
 * Free tier: 25 calls / day
 *
 * Used as a secondary provider for:
 *  - Forex intraday  (FX_INTRADAY)
 *  - Forex daily     (FX_DAILY)
 *  - Crypto intraday (CRYPTO_INTRADAY)
 *  - Crypto daily    (DIGITAL_CURRENCY_DAILY)
 */

const BASE    = import.meta.env.DEV ? '/api/alphavantage' : 'https://www.alphavantage.co'
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY ?? 'demo'

/** Map our TF → Alpha Vantage interval strings (intraday only) */
const AV_INTERVAL = { '1m':'1min','5m':'5min','15m':'15min','30m':'30min','1h':'60min' }

/**
 * Extract from_symbol / to_symbol from 'EUR/USD' style pairs.
 */
function splitPair(symbol) {
  const [from, to] = symbol.split('/')
  return { from: from ?? symbol, to: to ?? 'USD' }
}

/**
 * Normalise an Alpha Vantage time series object (keyed by date string)
 * into OHLCVBar[].
 *
 * @param {Record<string, object>} series - raw AV time series
 * @param {string} prefix - e.g. '1. open' or '1a. open (USD)'
 * @returns {OHLCVBar[]}
 */
function normaliseAVSeries(series, prefix = '1.') {
  return Object.entries(series)
    .map(([dateStr, bar]) => ({
      time:   new Date(dateStr).getTime(),
      open:   parseFloat(bar[`${prefix} open`]  ?? bar['1. open']  ?? 0),
      high:   parseFloat(bar[`${prefix} high`]  ?? bar['2. high']  ?? 0),
      low:    parseFloat(bar[`${prefix} low`]   ?? bar['3. low']   ?? 0),
      close:  parseFloat(bar[`${prefix} close`] ?? bar['4. close'] ?? 0),
      volume: parseFloat(bar['5. volume'] ?? bar['5. volume (USD)'] ?? 0),
    }))
    .sort((a, b) => a.time - b.time)
}

/**
 * Fetch Forex bars from Alpha Vantage.
 *
 * @param {string} symbol    - e.g. 'EUR/USD'
 * @param {string} timeframe - e.g. '1h'
 * @returns {Promise<OHLCVBar[]>}
 */
export async function fetchAlphaVantageForex(symbol, timeframe) {
  const { from, to } = splitPair(symbol)
  let url

  if (timeframe === '1d' || timeframe === '1w') {
    url = `${BASE}/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${API_KEY}`
  } else {
    const interval = AV_INTERVAL[timeframe]
    if (!interval) throw new Error(`AV: unsupported timeframe ${timeframe}`)
    url = `${BASE}/query?function=FX_INTRADAY&from_symbol=${from}&to_symbol=${to}&interval=${interval}&outputsize=full&apikey=${API_KEY}`
  }

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Alpha Vantage HTTP ${response.status}`)
  const data = await response.json()

  if (data['Error Message']) throw new Error(`AV Error: ${data['Error Message']}`)
  if (data['Note'])          throw new Error(`AV rate limit: ${data['Note']}`)

  const key = Object.keys(data).find(k => k.includes('Time Series'))
  if (!key) throw new Error('AV: unexpected response structure')

  return normaliseAVSeries(data[key])
}

/**
 * Fetch Crypto bars from Alpha Vantage.
 *
 * @param {string} symbol    - e.g. 'BTC/USD'
 * @param {string} timeframe
 * @returns {Promise<OHLCVBar[]>}
 */
export async function fetchAlphaVantageCrypto(symbol, timeframe) {
  const { from: coin } = splitPair(symbol)
  let url

  if (timeframe === '1d' || timeframe === '1w') {
    url = `${BASE}/query?function=DIGITAL_CURRENCY_DAILY&symbol=${coin}&market=USD&apikey=${API_KEY}`
  } else {
    const interval = AV_INTERVAL[timeframe]
    if (!interval) throw new Error(`AV: unsupported TF for crypto ${timeframe}`)
    url = `${BASE}/query?function=CRYPTO_INTRADAY&symbol=${coin}&market=USD&interval=${interval}&outputsize=full&apikey=${API_KEY}`
  }

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Alpha Vantage HTTP ${response.status}`)
  const data = await response.json()

  if (data['Error Message']) throw new Error(`AV: ${data['Error Message']}`)
  if (data['Note'])          throw new Error(`AV rate limit`)

  const key = Object.keys(data).find(k => k.includes('Time Series'))
  if (!key) throw new Error('AV: unexpected response structure')

  return normaliseAVSeries(data[key], '1a.')
}
