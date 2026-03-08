import { useMemo } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Pure calculation functions (exported for use outside React too)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exponential Moving Average
 * @param {OHLCVBar[]} bars
 * @param {number} period
 * @returns {{ time: number, value: number }[]}
 */
export function calcEMA(bars, period) {
  if (!bars?.length || bars.length < period) return []
  const k = 2 / (period + 1)
  const result = []
  let ema = null

  for (let i = 0; i < bars.length; i++) {
    if (ema === null) {
      if (i < period - 1) continue
      // Seed with simple average of first `period` bars
      ema = bars.slice(0, period).reduce((s, b) => s + b.close, 0) / period
    } else {
      ema = bars[i].close * k + ema * (1 - k)
    }
    result.push({ time: bars[i].time, value: ema })
  }
  return result
}

/**
 * Simple Moving Average
 * @param {OHLCVBar[]} bars
 * @param {number} period
 * @returns {{ time: number, value: number }[]}
 */
export function calcSMA(bars, period) {
  if (!bars?.length || bars.length < period) return []
  const result = []
  for (let i = period - 1; i < bars.length; i++) {
    const sum = bars.slice(i - period + 1, i + 1).reduce((s, b) => s + b.close, 0)
    result.push({ time: bars[i].time, value: sum / period })
  }
  return result
}

/**
 * Relative Strength Index (Wilder's smoothing)
 * @param {OHLCVBar[]} bars
 * @param {number} period
 * @returns {{ time: number, value: number }[]}
 */
export function calcRSI(bars, period = 14) {
  if (!bars?.length || bars.length < period + 1) return []
  const result = []
  let avgGain = 0
  let avgLoss = 0

  // Initial averages
  for (let i = 1; i <= period; i++) {
    const diff = bars[i].close - bars[i - 1].close
    avgGain += Math.max(0, diff)
    avgLoss += Math.max(0, -diff)
  }
  avgGain /= period
  avgLoss /= period

  const rs0 = avgGain / (avgLoss || 1e-10)
  result.push({ time: bars[period].time, value: 100 - 100 / (1 + rs0) })

  for (let i = period + 1; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close
    avgGain = (avgGain * (period - 1) + Math.max(0, diff))  / period
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period
    const rs  = avgGain / (avgLoss || 1e-10)
    result.push({ time: bars[i].time, value: 100 - 100 / (1 + rs) })
  }
  return result
}

/**
 * MACD (Moving Average Convergence Divergence)
 * @param {OHLCVBar[]} bars
 * @param {number} fastPeriod
 * @param {number} slowPeriod
 * @param {number} signalPeriod
 * @returns {{ macdLine, signalLine, histogram }}
 */
export function calcMACD(bars, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calcEMA(bars, fastPeriod)
  const emaSlow = calcEMA(bars, slowPeriod)

  // Align: emaSlow starts later than emaFast
  const offset   = slowPeriod - fastPeriod
  const macdLine = emaSlow.map((s, i) => ({
    time:  s.time,
    value: (emaFast[i + offset]?.value ?? 0) - s.value,
  }))

  // Signal line = EMA of macdLine
  const k = 2 / (signalPeriod + 1)
  const signalLine = []
  let sig = null

  macdLine.forEach((d, i) => {
    if (sig === null) {
      if (i < signalPeriod - 1) return
      sig = macdLine.slice(0, signalPeriod).reduce((s, m) => s + m.value, 0) / signalPeriod
    } else {
      sig = d.value * k + sig * (1 - k)
    }
    signalLine.push({ time: d.time, value: sig })
  })

  // Histogram (aligned to signalLine)
  const sigOffset   = macdLine.length - signalLine.length
  const histogram   = signalLine.map((s, i) => ({
    time:  s.time,
    value: (macdLine[i + sigOffset]?.value ?? 0) - s.value,
  }))

  return { macdLine, signalLine, histogram }
}

/**
 * Bollinger Bands
 * @param {OHLCVBar[]} bars
 * @param {number} period
 * @param {number} stdDevMult
 * @returns {{ time, upper, middle, lower }[]}
 */
export function calcBollingerBands(bars, period = 20, stdDevMult = 2) {
  if (!bars?.length || bars.length < period) return []
  const result = []
  for (let i = period - 1; i < bars.length; i++) {
    const slice  = bars.slice(i - period + 1, i + 1)
    const mean   = slice.reduce((s, b) => s + b.close, 0) / period
    const vari   = slice.reduce((s, b) => s + (b.close - mean) ** 2, 0) / period
    const std    = Math.sqrt(vari)
    result.push({
      time:   bars[i].time,
      upper:  mean + stdDevMult * std,
      middle: mean,
      lower:  mean - stdDevMult * std,
    })
  }
  return result
}

/**
 * Average True Range
 * @param {OHLCVBar[]} bars
 * @param {number} period
 * @returns {{ time, value }[]}
 */
export function calcATR(bars, period = 14) {
  if (!bars?.length || bars.length < period + 1) return []
  const trs = bars.slice(1).map((b, i) => {
    const prev = bars[i]
    return Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close))
  })
  const result = []
  let atr = trs.slice(0, period).reduce((s, v) => s + v, 0) / period
  result.push({ time: bars[period].time, value: atr })
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period
    result.push({ time: bars[i + 1].time, value: atr })
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook — memoises all indicator calculations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useIndicators — compute all enabled indicators for a set of bars.
 * Memoised: recalculates only when bars or config changes.
 *
 * @param {OHLCVBar[]} bars
 * @param {{ rsi, macd, bb, ema9, ema21, ema50, ema200 }} config
 * @returns {object} computed indicator data
 */
export function useIndicators(bars, config) {
  return useMemo(() => {
    if (!bars?.length) return {}
    return {
      rsi:    config.rsi    ? calcRSI(bars)              : null,
      macd:   config.macd   ? calcMACD(bars)             : null,
      bb:     config.bb     ? calcBollingerBands(bars)   : null,
      ema9:   config.ema9   ? calcEMA(bars, 9)           : null,
      ema21:  config.ema21  ? calcEMA(bars, 21)          : null,
      ema50:  config.ema50  ? calcEMA(bars, 50)          : null,
      ema200: config.ema200 ? calcEMA(bars, 200)         : null,
      atr:                    calcATR(bars),             // always computed for position sizing
    }
  }, [bars, config])
}
