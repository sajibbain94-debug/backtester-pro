import { useEffect, useRef } from 'react'
import { renderRSI, renderMACD } from '@engine/subPanelRenderer'

export function RSIPanel({ rsiData, visibleStart = 0, visibleLen = 200 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => renderRSI(canvas, rsiData, visibleStart, visibleLen))
    ro.observe(canvas)
    renderRSI(canvas, rsiData, visibleStart, visibleLen)
    return () => ro.disconnect()
  }, [rsiData, visibleStart, visibleLen])

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

export function MACDPanel({ macdData, visibleStart = 0, visibleLen = 200 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => renderMACD(canvas, macdData, visibleStart, visibleLen))
    ro.observe(canvas)
    renderMACD(canvas, macdData, visibleStart, visibleLen)
    return () => ro.disconnect()
  }, [macdData, visibleStart, visibleLen])

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
