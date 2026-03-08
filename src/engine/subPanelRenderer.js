/**
 * SubPanelRenderer — draws RSI or MACD into a dedicated canvas.
 * Decoupled from the main chart renderer for independent sizing.
 */

import { C } from '@utils/constants'

// ── RSI ───────────────────────────────────────────────────────────────────────

export function renderRSI(canvas, rsiData, visibleStart, visibleLen) {
  if (!canvas || !rsiData?.length) return
  const ctx = canvas.getContext('2d')
  const W   = canvas.width  = canvas.offsetWidth
  const H   = canvas.height = canvas.offsetHeight

  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  // Grid lines at 30/50/70
  ;[30, 50, 70].forEach(level => {
    const y = ((100 - level) / 100) * H
    ctx.strokeStyle = level === 50 ? 'rgba(120,123,134,0.3)' : 'rgba(120,123,134,0.15)'
    ctx.lineWidth   = 0.5
    ctx.setLineDash(level === 50 ? [] : [3, 3])
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W - 65, y); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = C.muted; ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillText(String(level), W - 60, y + 4)
  })

  // Overbought/oversold fill
  const y30 = ((100 - 30) / 100) * H
  const y70 = ((100 - 70) / 100) * H
  ctx.fillStyle = 'rgba(239,83,80,0.06)'
  ctx.fillRect(0, 0, W - 65, y70)
  ctx.fillStyle = 'rgba(38,166,154,0.06)'
  ctx.fillRect(0, y30, W - 65, H - y30)

  // RSI line
  const slice = rsiData.slice(visibleStart, visibleStart + visibleLen)
  if (!slice.length) return

  ctx.strokeStyle = C.purple; ctx.lineWidth = 1.5
  ctx.beginPath()
  slice.forEach((r, i) => {
    const x = (i / (slice.length - 1 || 1)) * (W - 65)
    const y = ((100 - r.value) / 100) * H
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  })
  ctx.stroke()

  // Label
  ctx.fillStyle = C.purple; ctx.font = 'bold 10px JetBrains Mono, monospace'
  ctx.fillText('RSI(14)', 4, 14)
  const lastVal = slice[slice.length - 1]?.value
  if (lastVal != null) {
    ctx.fillStyle = lastVal > 70 ? C.red : lastVal < 30 ? C.green : C.text
    ctx.fillText(lastVal.toFixed(2), 60, 14)
  }
}

// ── MACD ──────────────────────────────────────────────────────────────────────

export function renderMACD(canvas, macdData, visibleStart, visibleLen) {
  if (!canvas || !macdData) return
  const { macdLine, signalLine, histogram } = macdData
  if (!histogram?.length) return

  const ctx = canvas.getContext('2d')
  const W   = canvas.width  = canvas.offsetWidth
  const H   = canvas.height = canvas.offsetHeight

  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  const histSlice   = histogram.slice(visibleStart, visibleStart + visibleLen)
  const signSlice   = signalLine.slice(visibleStart, visibleStart + visibleLen)
  const macdSlice   = macdLine.slice(visibleStart, visibleStart + visibleLen)
  if (!histSlice.length) return

  const allVals  = histSlice.map(d => Math.abs(d.value))
  const maxAbsV  = Math.max(...allVals) || 1
  const midY     = H / 2

  // Zero line
  ctx.strokeStyle = 'rgba(120,123,134,0.4)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W - 65, midY); ctx.stroke()

  // Histogram bars
  const bw = Math.max(1, (W - 65) / histSlice.length - 0.5)
  histSlice.forEach((d, i) => {
    if (!d?.value) return
    const x   = (i / histSlice.length) * (W - 65)
    const barH = (d.value / maxAbsV) * (midY - 4)
    ctx.fillStyle = d.value >= 0
      ? (i > 0 && histSlice[i - 1].value > d.value ? 'rgba(38,166,154,0.5)' : 'rgba(38,166,154,0.85)')
      : (i > 0 && histSlice[i - 1].value < d.value ? 'rgba(239,83,80,0.5)'  : 'rgba(239,83,80,0.85)')
    ctx.fillRect(x, midY - barH, bw, barH)
  })

  // MACD line
  const drawLineSlice = (slice, color) => {
    if (!slice?.length) return
    ctx.strokeStyle = color; ctx.lineWidth = 1.2
    ctx.beginPath()
    slice.forEach((d, i) => {
      if (!d?.value) return
      const x = (i / (slice.length - 1 || 1)) * (W - 65)
      const y = midY - (d.value / maxAbsV) * (midY - 4)
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  drawLineSlice(macdSlice,  C.blue)
  drawLineSlice(signSlice,  C.orange)

  // Label
  ctx.font = 'bold 10px JetBrains Mono, monospace'
  ctx.fillStyle = C.blue;   ctx.fillText('MACD',   4,  14)
  ctx.fillStyle = C.orange; ctx.fillText('Signal', 48, 14)
}
