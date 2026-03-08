import { CACHE_TTL_MS } from '@utils/constants'

const PREFIX = 'btp_cache_'

/**
 * Lightweight localStorage cache with per-entry TTL.
 * Falls back gracefully if localStorage is unavailable (private browsing).
 */
const cache = {
  /** @param {string} key */
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return null
      const { value, expiresAt } = JSON.parse(raw)
      if (Date.now() > expiresAt) {
        localStorage.removeItem(PREFIX + key)
        return null
      }
      return value
    } catch {
      return null
    }
  },

  /**
   * @param {string} key
   * @param {*} value  - must be JSON-serialisable
   * @param {number} [ttl=CACHE_TTL_MS]
   */
  set(key, value, ttl = CACHE_TTL_MS) {
    try {
      localStorage.setItem(
        PREFIX + key,
        JSON.stringify({ value, expiresAt: Date.now() + ttl })
      )
    } catch {
      // Storage quota exceeded — fail silently
    }
  },

  /** Remove one entry */
  remove(key) {
    try { localStorage.removeItem(PREFIX + key) } catch { /* noop */ }
  },

  /** Wipe all BacktesterPro cache entries */
  clear() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k))
    } catch { /* noop */ }
  },

  /** Return cache size in bytes (approximate) */
  sizeBytes() {
    try {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .reduce((acc, k) => acc + (localStorage.getItem(k)?.length ?? 0) * 2, 0)
    } catch { return 0 }
  },
}

export default cache
