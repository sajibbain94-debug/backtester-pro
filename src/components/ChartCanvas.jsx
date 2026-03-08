import { useEffect, useRef, useCallback } from 'react'
import { ChartRenderer } from '@engine/chartRenderer'
import { useStore } from '@store'

/**
 * ChartCanvas — mounts a <canvas> and drives the ChartRenderer.
 * All interaction (pan, zoom, drawing) is handled here.
 * The renderer itself is completely outside React for 60fps performance.
 */
export default function ChartCanvas({ bars, replayIndex, indicators, onContextMenu }) {
  const canvasRef     = useRef(null)
  const rendererRef   = useRef(null)
  const panRef        = useRef({ dragging: false, startX: 0, startOffset: 0 })
  const drawRef       = useRef({ active: false, start: null })

  const { drawings, selectedTool, addDrawing, setSelectedTool, trades } = useStore(s => ({
    drawings:       s.drawings,
    selectedTool:   s.selectedTool,
    addDrawing:     s.addDrawing,
    setSelectedTool: s.setSelectedTool,
    trades:         s.trades,
  }))

  // ── Initialise renderer ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    rendererRef.current = new ChartRenderer(canvas)

    const resizeObserver = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      redraw()
    })
    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, []) // eslint-disable-line

  // ── Redraw whenever data changes ───────────────────────────────────────────
  const redraw = useCallback(() => {
    const renderer = rendererRef.current
    if (!renderer || !bars?.length) return
    renderer.render({ bars, indicators, drawings, trades, replayIdx: replayIndex })
  }, [bars, indicators, drawings, trades, replayIndex])

  useEffect(() => { redraw() }, [redraw])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const getPriceAtY = (y) => {
    const renderer = rendererRef.current
    if (!renderer || !bars?.length) return null
    const visibleBars = replayIndex !== null ? bars.slice(0, replayIndex + 1) : bars
    const { start, end } = renderer.visibleRange(visibleBars.length)
    const slice = visibleBars.slice(start, end)
    if (!slice.length) return null
    const maxP = Math.max(...slice.map(b => b.high))
    const minP = Math.min(...slice.map(b => b.low))
    return renderer.yToPrice(y, minP, maxP)
  }

  // ── Interaction handlers ───────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    const pos = getCanvasPos(e)
    const renderer = rendererRef.current

    // Drawing tools
    if (selectedTool && selectedTool !== 'cursor' && selectedTool !== 'cross') {
      const price = getPriceAtY(pos.y)
      if (!drawRef.current.active) {
        drawRef.current = { active: true, start: { x: pos.x, price } }
      } else {
        addDrawing({
          id:     Date.now(),
          type:   selectedTool,
          points: [drawRef.current.start, { x: pos.x, price }],
          price:  drawRef.current.start?.price,
          color:  '#2962ff',
        })
        drawRef.current = { active: false, start: null }
        setSelectedTool('cursor')
      }
      return
    }

    // Pan
    panRef.current = { dragging: true, startX: e.clientX, startOffset: renderer?.offsetX ?? 0 }
  }, [selectedTool, addDrawing, setSelectedTool]) // eslint-disable-line

  const handleMouseMove = useCallback((e) => {
    const renderer = rendererRef.current
    if (!renderer) return
    const pos = getCanvasPos(e)

    // Update crosshair
    renderer.crosshair = { x: pos.x, y: pos.y }

    // Pan
    if (panRef.current.dragging) {
      renderer.offsetX = panRef.current.startOffset + (e.clientX - panRef.current.startX)
    }
    redraw()
  }, [redraw]) // eslint-disable-line

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false
  }, [])

  const handleMouseLeave = useCallback(() => {
    panRef.current.dragging = false
    const renderer = rendererRef.current
    if (renderer) { renderer.crosshair = null; redraw() }
  }, [redraw])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const renderer = rendererRef.current
    if (!renderer) return
    const factor = e.deltaY > 0 ? 0.88 : 1.14
    renderer.scale = Math.max(0.15, Math.min(6, renderer.scale * factor))
    redraw()
  }, [redraw])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const pos = getCanvasPos(e)
    const price = getPriceAtY(pos.y)
    onContextMenu?.({ x: e.clientX, y: e.clientY, price, canvasPos: pos })
  }, [onContextMenu]) // eslint-disable-line

  // ── Cursor class ──────────────────────────────────────────────────────────
  const cursorClass = selectedTool === 'cursor' ? 'tool-cursor' : 'tool-draw'

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    />
  )
}
