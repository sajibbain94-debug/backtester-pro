import { useState, useEffect, useRef } from 'react'
import { fetchBars } from '@services/dataService'

/**
 * useMarketData — fetches and manages OHLCV data for a given symbol/timeframe.
 *
 * Returns:
 *   bars     - OHLCVBar[] sorted ascending by time
 *   loading  - boolean
 *   error    - string | null
 *   source   - 'cache' | 'live' | 'mock'
 *   refresh  - function to force re-fetch (bypasses cache)
 */
export function useMarketData(symbol, timeframe) {
  const [bars,    setBars]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [source,  setSource]  = useState(null)
  const abortRef = useRef(null)

  const load = async (force = false) => {
    setLoading(true)
    setError(null)

    // Cancel any in-flight fetch
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await fetchBars(symbol, timeframe, force)
      if (!controller.signal.aborted) {
        setBars(result.bars)
        setSource(result.source)
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message)
        setBars([])
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe])

  const refresh = () => load(true)

  return { bars, loading, error, source, refresh }
}
