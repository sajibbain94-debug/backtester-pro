/**
 * ChartRenderer — stateful canvas drawing engine.
 *
 * Responsibilities:
 *  - Coordinate system management (price ↔ pixel transforms)
 *  - Candlestick rendering
 *  - Indicator overlays (EMA, BB)
 *  - Drawing tool overlays (trendlines, hlines, fib, rect)
 *  - Trade marker rendering
 *  - Price & time scale axes
 *  - Crosshair
 *
 * The renderer is intentionally NOT a React component — it's a plain
 * class consumed by the ChartCanvas component via useRef/useEffect.
 * This keeps the 60fps render loop completely outside React's reconciler.
 */

import { C, EMA_COLORS } from '@utils/constants'
import { fmtPrice, fmtDateTime } from '@utils/format'

export class ChartRenderer {
  constructor(canvas) {
    this.canvas     = canvas
    this.ctx        = canvas.getContext('2d')
    this.offsetX    = 0        // pan offset in pixels
    this.scale      = 1        // zoom scale multiplier
    this.crosshair  = null     // { x, y } in canvas coords
    this.BASE_BAR_W = 8        // pixels at scale=1
    this.PRICE_AXIS_W = 85
    this.TIME_AXIS_H  = 28
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  get barWidth() {
    return Math.max(1, this.scale * this.BASE_BAR_W)
  }

  get chartW() { return this.canvas.width - this.PRICE_AXIS_W }
  get chartH() { return this.canvas.height - this.TIME_AXIS_H }

  /** Compute visible bar index range given current pan/zoom */
  visibleRange(totalBars) {
    const bw   = this.barWidth
    const cap  = Math.floor(this.chartW / bw)
    const end  = Math.min(totalBars, totalBars + Math.round(this.offsetX / bw))
    const start = Math.max(0, end - cap - 2)
    return { start, end: Math.min(totalBars, end + 2) }
  }

  /** Price → Y pixel */
  priceToY(price, minP, maxP) {
    const range = maxP - minP || 1
    return ((maxP - price) / range) * (this.chartH - 20) + 10
  }

  /** Y pixel → price */
  yToPrice(y, minP, maxP) {
    const range = maxP - minP || 1
    return maxP - ((y - 10) / (this.chartH - 20)) * range
  }

  /** Bar index (within slice) → X pixel */
  barIndexToX(i) {
    return i * this.barWidth + (this.chartW - /* total visible bars inferred */ 0)
  }

  // ── Main render ───────────────────────────────────────────────────────────

  render({
    bars,
    indicators = {},
    drawings   = [],
    trades     = [],
    replayIdx  = null,
  }) {
    if (!bars?.length) return

    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height

    // Determine visible slice
    const visibleBars = replayIdx !== null ? bars.slice(0, replayIdx + 1) : bars
    const { start, end } = this.visibleRange(visibleBars.length)
    const slice = visibleBars.slice(start, end)
    if (!slice.length) return

    // Price extents
    const maxP = Math.max(...slice.map(b => b.high))
    const minP = Math.min(...slice.map(b => b.low))
    const py   = (p) => this.priceToY(p, minP, maxP)

    // Bar x position helper
    const bx = (i) => {
      const totalVisible = Math.floor(this.chartW / this.barWidth)
      const offsetBars   = Math.round(this.offsetX / this.barWidth)
      return (i - (visibleBars.length - totalVisible - offsetBars)) * this.barWidth
    }

    // ── Clear ──────────────────────────────────────────────────────────────
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, W, H)

    // ── Grid lines ─────────────────────────────────────────────────────────
    this._drawGrid(ctx, W, H, minP, maxP, py)

    // ── Bollinger Bands ────────────────────────────────────────────────────
    if (indicators.bb?.length) {
      this._drawBB(ctx, indicators.bb, start, slice.length, bx, py)
    }

    // ── EMAs ───────────────────────────────────────────────────────────────
    for (const key of ['ema9','ema21','ema50','ema200']) {
      if (indicators[key]?.length) {
        this._drawLine(ctx, indicators[key], start, slice.length, bx, py, EMA_COLORS[key], 1.2)
      }
    }

    // ── Candles ────────────────────────────────────────────────────────────
    this._drawCandles(ctx, slice, bx, py)

    // ── Drawings ───────────────────────────────────────────────────────────
    this._drawAnnotations(ctx, drawings, bx, py, visibleBars, start, slice.length, W)

    // ── Trade markers ──────────────────────────────────────────────────────
    this._drawTrades(ctx, trades, visibleBars, start, slice.length, bx, py)

    // ── Axes ───────────────────────────────────────────────────────────────
    this._drawPriceAxis(ctx, W, H, minP, maxP, py)
    this._drawTimeAxis(ctx, W, H, slice, bx)

    // ── Current price line ─────────────────────────────────────────────────
    const lastClose = visibleBars[visibleBars.length - 1]?.close
    if (lastClose != null) this._drawCurrentPriceLine(ctx, W, lastClose, py)

    // ── Crosshair ──────────────────────────────────────────────────────────
    if (this.crosshair) {
      this._drawCrosshair(ctx, W, H, this.crosshair, minP, maxP, py, slice, bx, start)
    }
  }

  // ── Private render methods ────────────────────────────────────────────────

  _drawGrid(ctx, W, H, minP, maxP, py) {
    ctx.strokeStyle = C.border
    ctx.lineWidth   = 0.5

    const priceSteps = 7
    for (let i = 0; i <= priceSteps; i++) {
      const price = maxP - ((maxP - minP) / priceSteps) * i
      const y = py(price)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.chartW, y); ctx.stroke()
    }

    const timeSteps = 8
    for (let i = 0; i <= timeSteps; i++) {
      const x = (this.chartW / timeSteps) * i
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.chartH); ctx.stroke()
    }
  }

  _drawCandles(ctx, slice, bx, py) {
    const bw = this.barWidth
    slice.forEach((bar, i) => {
      const x    = bx(i)
      const midX = x + bw / 2
      const bull = bar.close >= bar.open
      const col  = bull ? C.green : C.red

      // Wick
      ctx.strokeStyle = col
      ctx.lineWidth   = Math.max(1, bw * 0.08)
      ctx.beginPath(); ctx.moveTo(midX, py(bar.high)); ctx.lineTo(midX, py(bar.low)); ctx.stroke()

      // Body
      const bodyTop = py(Math.max(bar.open, bar.close))
      const bodyBot = py(Math.min(bar.open, bar.close))
      const bodyH   = Math.max(1, bodyBot - bodyTop)
      const bodyW   = Math.max(1, bw - 2)
      ctx.fillStyle = col
      ctx.fillRect(x + 1, bodyTop, bodyW, bodyH)
    })
  }

  _drawBB(ctx, bb, start, sliceLen, bx, py) {
    const colors = { upper: 'rgba(41,98,255,0.5)', middle: 'rgba(41,98,255,0.3)', lower: 'rgba(41,98,255,0.5)' }
    for (const key of ['upper', 'middle', 'lower']) {
      ctx.strokeStyle = colors[key]
      ctx.lineWidth   = 1
      ctx.beginPath()
      let first = true
      for (let i = 0; i < sliceLen; i++) {
        const d = bb[start + i]
        if (!d) continue
        const x = bx(i) + this.barWidth / 2
        const y = py(d[key])
        if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // Fill band
    ctx.fillStyle = 'rgba(41,98,255,0.04)'
    ctx.beginPath()
    for (let i = 0; i < sliceLen; i++) {
      const d = bb[start + i]; if (!d) continue
      if (i === 0) ctx.moveTo(bx(i) + this.barWidth/2, py(d.upper))
      else ctx.lineTo(bx(i) + this.barWidth/2, py(d.upper))
    }
    for (let i = sliceLen - 1; i >= 0; i--) {
      const d = bb[start + i]; if (!d) continue
      ctx.lineTo(bx(i) + this.barWidth/2, py(d.lower))
    }
    ctx.closePath(); ctx.fill()
  }

  _drawLine(ctx, series, start, sliceLen, bx, py, color, lineWidth = 1) {
    ctx.strokeStyle = color
    ctx.lineWidth   = lineWidth
    ctx.beginPath()
    let first = true
    for (let i = 0; i < sliceLen; i++) {
      const d = series[start + i]
      if (!d) continue
      const x = bx(i) + this.barWidth / 2
      const y = py(d.value)
      if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  _drawAnnotations(ctx, drawings, bx, py, bars, start, sliceLen, W) {
    drawings.forEach(d => {
      ctx.strokeStyle = d.color || C.blue
      ctx.lineWidth   = 1.5

      if (d.type === 'trendline' && d.points?.length === 2) {
        ctx.beginPath()
        ctx.moveTo(d.points[0].x, py(d.points[0].price))
        ctx.lineTo(d.points[1].x, py(d.points[1].price))
        ctx.stroke()
      }

      if (d.type === 'hline' && d.price != null) {
        const y = py(d.price)
        ctx.setLineDash([5, 4])
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.chartW, y); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = d.color || C.blue
        ctx.font      = '11px JetBrains Mono, monospace'
        ctx.fillText(fmtPrice(d.price), this.chartW - 130, y - 4)
      }

      if (d.type === 'fib' && d.points?.length === 2) {
        const [p1, p2] = d.points
        const levels   = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
        levels.forEach(lvl => {
          const price = p2.price + (p1.price - p2.price) * lvl
          const y     = py(price)
          ctx.strokeStyle = `rgba(245,158,11,0.6)`; ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.chartW, y); ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = C.yellow; ctx.font = '10px monospace'
          ctx.fillText(`${(lvl * 100).toFixed(1)}%  ${fmtPrice(price)}`, 6, y - 3)
        })
      }

      if (d.type === 'rect' && d.points?.length === 2) {
        const x1 = Math.min(d.points[0].x, d.points[1].x)
        const x2 = Math.max(d.points[0].x, d.points[1].x)
        const y1 = py(Math.max(d.points[0].price, d.points[1].price))
        const y2 = py(Math.min(d.points[0].price, d.points[1].price))
        ctx.fillStyle   = 'rgba(41,98,255,0.06)'
        ctx.strokeStyle = C.blue; ctx.lineWidth = 1
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      }
    })
  }

  _drawTrades(ctx, trades, bars, start, sliceLen, bx, py) {
    trades.forEach(t => {
      const entryIdx = bars.findIndex(b => b.time >= t.entryTime)
      if (entryIdx < 0) return
      const ei = entryIdx - start
      if (ei < 0 || ei >= sliceLen) return
      const ex = bx(ei) + this.barWidth / 2
      const ey = py(t.entryPrice)

      // Entry dot
      ctx.fillStyle = t.type === 'long' ? C.green : C.red
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill()
      // Entry arrow
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(t.type === 'long' ? '▲' : '▼', ex, ey + 3)
      ctx.textAlign = 'left'

      if (t.exitPrice) {
        const exitIdx = bars.findIndex(b => b.time >= t.exitTime)
        if (exitIdx >= 0) {
          const xi = exitIdx - start
          if (xi >= 0 && xi < sliceLen) {
            const xx = bx(xi) + this.barWidth / 2
            const xy = py(t.exitPrice)
            const col = (t.pnl ?? 0) >= 0 ? C.green : C.red
            ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4])
            ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(xx, xy); ctx.stroke()
            ctx.setLineDash([])
            ctx.fillStyle = col
            ctx.beginPath(); ctx.arc(xx, xy, 5, 0, Math.PI * 2); ctx.fill()
          }
        }
      }

      // SL / TP lines
      if (t.sl) {
        const slY = py(t.sl)
        ctx.strokeStyle = C.red; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
        ctx.beginPath(); ctx.moveTo(ex, slY); ctx.lineTo(Math.min(ex + 80, this.chartW), slY); ctx.stroke()
        ctx.setLineDash([])
      }
      if (t.tp) {
        const tpY = py(t.tp)
        ctx.strokeStyle = C.green; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
        ctx.beginPath(); ctx.moveTo(ex, tpY); ctx.lineTo(Math.min(ex + 80, this.chartW), tpY); ctx.stroke()
        ctx.setLineDash([])
      }
    })
  }

  _drawPriceAxis(ctx, W, H, minP, maxP, py) {
    ctx.fillStyle   = C.panel
    ctx.fillRect(this.chartW, 0, this.PRICE_AXIS_W, H)
    ctx.strokeStyle = C.border; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(this.chartW, 0); ctx.lineTo(this.chartW, H); ctx.stroke()

    ctx.fillStyle = C.muted
    ctx.font      = '11px JetBrains Mono, monospace'
    const steps   = 7
    for (let i = 0; i <= steps; i++) {
      const price = maxP - ((maxP - minP) / steps) * i
      const y     = py(price)
      ctx.fillText(fmtPrice(price), this.chartW + 5, y + 4)
    }
  }

  _drawTimeAxis(ctx, W, H, slice, bx) {
    ctx.fillStyle   = C.panel
    ctx.fillRect(0, this.chartH, W, this.TIME_AXIS_H)
    ctx.strokeStyle = C.border; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, this.chartH); ctx.lineTo(W, this.chartH); ctx.stroke()

    ctx.fillStyle = C.muted; ctx.font = '10px JetBrains Mono, monospace'
    const step = Math.max(1, Math.floor(slice.length / 8))
    slice.forEach((bar, i) => {
      if (i % step !== 0) return
      const x = bx(i)
      ctx.fillText(fmtDateTime(bar.time), x + 2, this.chartH + 18)
    })
  }

  _drawCurrentPriceLine(ctx, W, price, py) {
    const y = py(price)
    ctx.strokeStyle = C.blue; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.chartW, y); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = C.blue
    ctx.fillRect(this.chartW, y - 9, this.PRICE_AXIS_W, 18)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px JetBrains Mono, monospace'
    ctx.fillText(fmtPrice(price), this.chartW + 5, y + 4)
  }

  _drawCrosshair(ctx, W, H, { x, y }, minP, maxP, py, slice, bx, start) {
    ctx.strokeStyle = 'rgba(120,123,134,0.6)'
    ctx.lineWidth   = 1; ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.chartH); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.chartW, y); ctx.stroke()
    ctx.setLineDash([])

    // Price label on Y-axis
    const hoverPrice = this.yToPrice(y, minP, maxP)
    ctx.fillStyle = '#4a4f61'
    ctx.fillRect(this.chartW, y - 9, this.PRICE_AXIS_W, 18)
    ctx.fillStyle = C.text; ctx.font = '11px JetBrains Mono, monospace'
    ctx.fillText(fmtPrice(hoverPrice), this.chartW + 5, y + 4)

    // Tooltip with OHLCV
    const bw     = this.barWidth
    const hovIdx = Math.round((x - (this.chartW - slice.length * bw)) / bw)
    const bar    = slice[Math.max(0, Math.min(slice.length - 1, hovIdx))]
    if (bar) {
      const bull  = bar.close >= bar.open
      const lines = [
        `O: ${fmtPrice(bar.open)}`,
        `H: ${fmtPrice(bar.high)}`,
        `L: ${fmtPrice(bar.low)}`,
        `C: ${fmtPrice(bar.close)}`,
        `V: ${Math.round(bar.volume).toLocaleString()}`,
      ]
      const tw   = 140, th = lines.length * 16 + 12
      const tx   = Math.min(x + 12, this.chartW - tw - 4)
      const ty   = Math.max(4, Math.min(y - th / 2, this.chartH - th - 4))
      ctx.fillStyle   = 'rgba(30,33,48,0.92)'
      ctx.strokeStyle = bull ? C.green : C.red; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect?.(tx, ty, tw, th, 4) ?? ctx.rect(tx, ty, tw, th)
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = C.text; ctx.font = '11px JetBrains Mono, monospace'
      lines.forEach((l, i) => ctx.fillText(l, tx + 8, ty + 16 + i * 16))
    }
  }
}
