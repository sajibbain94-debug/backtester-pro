/**
 * DataService — Unified market data layer.
 *
 * Architecture (Proxy / Strategy pattern):
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │                   DataService                    │
 *   │  fetchBars(symbol, timeframe)                    │
 *   │       │                                          │
 *   │       ├── 1. Check localStorage cache            │
 *   │       │        └─ HIT → return cached data       │
 *   │       │                                          │
 *   │       ├── 2. Determine provider by symbol class  │
 *   │       │        ├─ Forex    → try Finnhub          │
 *   │       │        ├─ Crypto   → try Finnhub          │
 *   │       │        ├─ Commodity→ try Alpha Vantage   │
 *   │       │        └─ Index    → try Finnhub          │
 *   │       │                                          │
 *   │       ├── 3. On failure → try secondary provider │
 *   │       │                                          │
 *   │       └── 4. On all failures → generateMock()   │
 *   └──────────────────────────────────────────────────┘
 *
 * All providers return the canonical OHLCVBar[]:
 *   { time: ms, open, high, low, close, volume }
 */

import cache from './cache'
import { fetchFinnhub } from './providers/finnhub'
import { fetchAlphaVantageForex, fetchAlphaVantageCrypto } from './providers/alphaVantage'
import { generateMockOHLCV } from '@utils/mockGenerator'
import { ASSETS } from '@utils/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Classify a symbol into its asset class */
function classify(symbol) {
  if (ASSETS.Forex.includes(symbol))       return 'forex'
  if (ASSETS.Crypto.includes(symbol))      return 'crypto'
  if (ASSETS.Commodities.includes(symbol)) return 'commodity'
  if (ASSETS.Indices.includes(symbol))     return 'index'
  return 'unknown'
}

/** Unix seconds range for the last N days */
function rangeSeconds(days = 365 * 2) {
  const to   = Math.floor(Date.now() / 1000)
  const from = to - days * 86_400
  return { from, to }
}

/** Build a stable cache key */
function cacheKey(symbol, timeframe) {
  return `${symbol.replace('/', '_')}_${timeframe}`
}

// ─── Fetcher strategies ───────────────────────────────────────────────────────

async function fetchForex(symbol, timeframe) {
  const { from, to } = rangeSeconds(365 * 2)
  // Primary: Finnhub
  try {
    return await fetchFinnhub(symbol, timeframe, from, to)
  } catch (err) {
    console.warn('[DataService] Finnhub failed for forex, trying AV:', err.message)
  }
  // Secondary: Alpha Vantage
  return await fetchAlphaVantageForex(symbol, timeframe)
}

async function fetchCrypto(symbol, timeframe) {
  const { from, to } = rangeSeconds(365 * 2)
  try {
    return await fetchFinnhub(symbol, timeframe, from, to)
  } catch (err) {
    console.warn('[DataService] Finnhub failed for crypto, trying AV:', err.message)
  }
  return await fetchAlphaVantageCrypto(symbol, timeframe)
}

async function fetchCommodity(symbol, timeframe) {
  const { from, to } = rangeSeconds(365 * 2)
  // Commodities: Finnhub has futures data
  return await fetchFinnhub(symbol, timeframe, from, to)
}

async function fetchIndex(symbol, timeframe) {
  const { from, to } = rangeSeconds(365 * 2)
  return await fetchFinnhub(symbol, timeframe, from, to)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch OHLCV bars for a symbol/timeframe combination.
 * Implements:
 *   1. Cache read
 *   2. Provider dispatch with fallback chain
 *   3. Cache write on success
 *   4. Mock data as last resort
 *
 * @param {string} symbol
 * @param {string} timeframe
 * @returns {Promise<{ bars: OHLCVBar[], source: 'cache'|'live'|'mock' }>}
 */
export async function fetchBars(symbol, timeframe) {
  const key = cacheKey(symbol, timeframe)

  // 1. Cache hit
  const cached = cache.get(key)
  if (cached) {
    console.info(`[DataService] Cache hit: ${key}`)
    return { bars: cached, source: 'cache' }
  }

  const isRealDataEnabled = import.meta.env.VITE_ENABLE_REAL_DATA !== 'false'
  const hasKeys = !!(import.meta.env.VITE_FINNHUB_API_KEY || import.meta.env.VITE_ALPHA_VANTAGE_API_KEY)

  // 2. Live fetch (only if keys are configured)
  if (isRealDataEnabled && hasKeys) {
    const assetClass = classify(symbol)
    try {
      let bars
      switch (assetClass) {
        case 'forex':     bars = await fetchForex(symbol, timeframe);     break
        case 'crypto':    bars = await fetchCrypto(symbol, timeframe);    break
        case 'commodity': bars = await fetchCommodity(symbol, timeframe); break
        case 'index':     bars = await fetchIndex(symbol, timeframe);     break
        default:          throw new Error(`Unknown asset class for ${symbol}`)
      }

      // Sanity-check bars
      if (!bars?.length) throw new Error('Empty response')

      // Sort ascending by time (some providers return descending)
      bars.sort((a, b) => a.time - b.time)

      // Cache the result
      cache.set(key, bars)
      console.info(`[DataService] Live data fetched: ${symbol}/${timeframe} (${bars.length} bars)`)
      return { bars, source: 'live' }

    } catch (err) {
      console.warn(`[DataService] All live providers failed for ${symbol}/${timeframe}:`, err.message)
    }
  }

  // 3. Mock fallback
  console.info(`[DataService] Using mock data: ${symbol}/${timeframe}`)
  const bars = generateMockOHLCV(symbol, timeframe, 800)
  return { bars, source: 'mock' }
}

/** Invalidate cache for a specific symbol/timeframe */
export function invalidateCache(symbol, timeframe) {
  cache.remove(cacheKey(symbol, timeframe))
}

/** Clear entire data cache */
export function clearAllCache() {
  cache.clear()
}

/** Return cache storage size in KB */
export function cacheSizeKB() {
  return (cache.sizeBytes() / 1024).toFixed(1)
}
