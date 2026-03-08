import { useEffect, useRef } from 'react'
import { useStore } from '@store'
import { fmtPrice } from '@utils/format'

/**
 * Right-click context menu for the chart canvas.
 * Appears at the cursor position with chart-specific actions.
 */
export default function ContextMenu({ context, onClose }) {
  const menuRef = useRef(null)
  const { addDrawing, clearDrawings, setSelectedTool } = useStore(s => ({
    addDrawing:      s.addDrawing,
    clearDrawings:   s.clearDrawings,
    setSelectedTool: s.setSelectedTool,
  }))

  // Close on outside click or Escape
  useEffect(() => {
    const handleKey   = (e) => e.key === 'Escape' && onClose()
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  if (!context) return null

  // Keep menu within viewport
  const style = {
    position: 'fixed',
    left: Math.min(context.x, window.innerWidth  - 220),
    top:  Math.min(context.y, window.innerHeight - 260),
    zIndex: 9999,
  }

  const Item = ({ icon, label, onClick, danger = false }) => (
    <button
      onClick={() => { onClick(); onClose() }}
      className={`
        w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left
        hover:bg-tv-hover transition-colors rounded
        ${danger ? 'text-tv-red' : 'text-tv-text'}
      `}
    >
      <span className="w-4 text-center text-tv-muted">{icon}</span>
      {label}
    </button>
  )

  const Divider = () => <div className="h-px bg-tv-border my-1" />
  const Header  = ({ text }) => (
    <div className="px-3 py-1 text-2xs text-tv-muted font-semibold uppercase tracking-wider">{text}</div>
  )

  return (
    <div
      ref={menuRef}
      style={style}
      className="w-52 bg-tv-panel border border-tv-border rounded-lg shadow-tv-dropdown py-1.5 animate-fade-in"
    >
      {context.price != null && (
        <>
          <div className="px-3 py-1.5 text-2xs text-tv-muted flex justify-between">
            <span>Price at cursor</span>
            <span className="font-mono text-tv-text font-semibold">{fmtPrice(context.price)}</span>
          </div>
          <Divider />
        </>
      )}

      <Header text="Drawing" />
      <Item icon="╱" label="Add Trendline"        onClick={() => setSelectedTool('trendline')} />
      <Item icon="—" label="Add Horizontal Line"  onClick={() => setSelectedTool('hline')} />
      <Item icon="≈" label="Add Fibonacci"        onClick={() => setSelectedTool('fib')} />
      <Item icon="□" label="Add Rectangle"        onClick={() => setSelectedTool('rect')} />

      <Divider />

      {context.price != null && (
        <Item icon="—" label={`H-Line @ ${fmtPrice(context.price)}`}
          onClick={() => addDrawing({ id: Date.now(), type: 'hline', price: context.price, color: '#2962ff' })} />
      )}

      <Divider />

      <Header text="Chart" />
      <Item icon="🔍" label="Reset Zoom"          onClick={() => {}} />
      <Item icon="↺"  label="Clear All Drawings"  onClick={clearDrawings} danger />
    </div>
  )
}
