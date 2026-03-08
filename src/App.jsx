import { useState, useMemo, useCallback } from 'react'
import { useStore, selectSymbol, selectTimeframe, selectIndicators } from '@store'
import { useMarketData }  from '@hooks/useMarketData'
import { useReplay }      from '@hooks/useReplay'
import { useIndicators }  from '@hooks/useIndicators'

import Toolbar          from '@components/Toolbar'
import ReplayBar        from '@components/ReplayBar'
import DrawingToolbar   from '@components/DrawingToolbar'
import ChartCanvas      from '@components/ChartCanvas'
import { RSIPanel, MACDPanel } from '@components/SubPanel'
import OrderPanel       from '@components/OrderPanel'
import Metrics          from '@components/Metrics'
import Journal          from '@components/Journal'
import OpenPositions    from '@components/OpenPositions'
import ContextMenu      from '@components/ContextMenu'

export default function App() {
  const symbol     = useStore(selectSymbol)
  const timeframe  = useStore(selectTimeframe)
  const indConfig  = useStore(selectIndicators)
  const activeRightPanel  = useStore(s => s.activeRightPanel)
  const setActiveRightPanel = useStore(s => s.setActiveRightPanel)
  const activeBottomTab   = useStore(s => s.activeBottomTab)
  const setActiveBottomTab  = useStore(s => s.setActiveBottomTab)

  // ── Data ──────────────────────────────────────────────────────────────────
  const { bars, loading, error, source, refresh } = useMarketData(symbol, timeframe)

  // ── Replay ────────────────────────────────────────────────────────────────
  const replay = useReplay(bars.length)
  const visibleBars = replay.replayIndex !== null
    ? bars.slice(0, replay.replayIndex + 1)
    : bars

  const lastBar = visibleBars[visibleBars.length - 1]
  const lastPrice = lastBar?.close ?? null

  // ── Indicators ────────────────────────────────────────────────────────────
  const computed = useIndicators(visibleBars, indConfig)

  // ── Context menu ──────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState(null)
  const handleContextMenu = useCallback((ctx) => setCtxMenu(ctx), [])
  const closeContextMenu  = useCallback(() => setCtxMenu(null), [])

  // ── Derived equity ────────────────────────────────────────────────────────
  const equity = useStore(s => {
    const closed = s.trades.filter(t => t.exitPrice != null)
    return s.account.balance + closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  })

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-tv-bg text-tv-text select-none">

      {/* ── Top Toolbar ── */}
      <Toolbar lastPrice={lastPrice} dataSource={source} onRefresh={refresh} />

      {/* ── Replay Controls ── */}
      <ReplayBar replay={replay} bars={bars} lastBar={lastBar} />

      {/* ── Main body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Drawing tool sidebar ── */}
        <DrawingToolbar />

        {/* ── Chart area ── */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Main chart */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-tv-bg/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-tv-blue border-t-transparent rounded-full animate-spin" />
                  <span className="text-tv-muted text-xs">Loading {symbol} data…</span>
                </div>
              </div>
            )}
            {error && !loading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-tv-red/20 border border-tv-red/40 rounded-lg px-4 py-2 text-tv-red text-xs">
                ⚠ {error} — showing synthetic data
              </div>
            )}
            <ChartCanvas
              bars={visibleBars}
              replayIndex={replay.replayIndex}
              indicators={computed}
              onContextMenu={handleContextMenu}
            />
          </div>

          {/* Sub-panels */}
          {indConfig.rsi && (
            <div className="h-20 flex-shrink-0 border-t border-tv-border">
              <RSIPanel rsiData={computed.rsi} />
            </div>
          )}
          {indConfig.macd && (
            <div className="h-20 flex-shrink-0 border-t border-tv-border">
              <MACDPanel macdData={computed.macd} />
            </div>
          )}

          {/* Bottom tab area */}
          <div className="h-44 flex-shrink-0 border-t-2 border-tv-border flex flex-col">
            <div className="flex flex-shrink-0 bg-tv-panel border-b border-tv-border">
              {[
                ['journal',  '📋 Journal'],
                ['metrics',  '📊 Performance'],
                ['open',     '⚡ Positions'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setActiveBottomTab(id)}
                  className={`px-3 py-1.5 text-xs transition-colors border-b-2 ${
                    activeBottomTab === id
                      ? 'text-tv-text border-tv-blue bg-tv-bg'
                      : 'text-tv-muted border-transparent hover:text-tv-text hover:bg-tv-hover'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {activeBottomTab === 'journal'  && <Journal />}
              {activeBottomTab === 'metrics'  && <Metrics />}
              {activeBottomTab === 'open'     && (
                <OpenPositions lastPrice={lastPrice} replayIndex={replay.replayIndex} bars={bars} />
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-56 flex flex-col flex-shrink-0 bg-tv-panel border-l border-tv-border">
          {/* Right panel tabs */}
          <div className="flex flex-shrink-0 border-b border-tv-border">
            {[['order','Order'],['stats','Stats']].map(([id, label]) => (
              <button key={id} onClick={() => setActiveRightPanel(id)}
                className={`flex-1 py-2 text-xs transition-colors border-b-2 ${
                  activeRightPanel === id
                    ? 'text-tv-text border-tv-blue bg-tv-bg'
                    : 'text-tv-muted border-transparent hover:text-tv-text hover:bg-tv-hover'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {activeRightPanel === 'order' && (
              <OrderPanel lastPrice={lastPrice} replayIndex={replay.replayIndex} bars={bars} />
            )}
            {activeRightPanel === 'stats' && <Metrics />}
          </div>

          {/* Mini watchlist */}
          <div className="border-t border-tv-border flex-shrink-0">
            <div className="px-3 py-1.5 text-2xs text-tv-muted font-semibold uppercase tracking-wider">Watchlist</div>
            {['EUR/USD','BTC/USD','XAU/USD','SPX500'].map(sym => (
              <WatchItem key={sym} sym={sym} active={sym === symbol} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && <ContextMenu context={ctxMenu} onClose={closeContextMenu} />}
    </div>
  )
}

/** Watchlist row with a synthetic price change */
function WatchItem({ sym, active }) {
  const setSymbol = useStore(s => s.setSymbol)
  // Deterministic fake % change based on symbol name
  const code = sym.charCodeAt(0) + sym.charCodeAt(sym.length - 1)
  const pct  = (((code % 200) - 100) / 100).toFixed(2)
  const up   = parseFloat(pct) >= 0

  return (
    <button onClick={() => setSymbol(sym)}
      className={`
        flex justify-between items-center w-full px-3 py-1 text-xs transition-colors
        ${active ? 'bg-tv-hover' : 'hover:bg-tv-hover'}
      `}
    >
      <span className={`font-semibold ${active ? 'text-tv-text' : 'text-tv-muted'}`}>{sym}</span>
      <span className={`font-mono text-2xs ${up ? 'text-tv-green' : 'text-tv-red'}`}>
        {up ? '+' : ''}{pct}%
      </span>
    </button>
  )
}
