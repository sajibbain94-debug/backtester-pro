/**
 * Format a price with appropriate decimal places.
 * Forex/commodities: 5dp  |  Large values (BTC, indices): 2dp
 */
export function fmtPrice(value) {
  if (value == null || isNaN(value)) return '—'
  return value > 999 ? value.toFixed(2) : value.toFixed(5)
}

/** Format P&L with +/- sign and $ prefix */
export function fmtPnl(value) {
  if (value == null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}$${value.toFixed(2)}`
}

/** Format a Unix ms timestamp as date string */
export function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format a Unix ms timestamp as datetime */
export function fmtDateTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${da} ${hh}:${mm}`
}

/** Compact number (1200 → 1.2k) */
export function fmtCompact(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}
