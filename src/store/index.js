import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { DEFAULT_ACCOUNT, DEFAULT_INDICATORS } from '@utils/constants'

/**
 * Global application store using Zustand + Immer for immutable updates.
 * Session data (trades, account state) is persisted to localStorage via
 * the `persist` middleware.
 */
export const useStore = create(
  persist(
    immer((set, get) => ({

      // ── Symbol & Timeframe ─────────────────────────────────────────────────
      symbol:    'EUR/USD',
      timeframe: '1h',
      setSymbol:    (s)  => set(state => { state.symbol    = s }),
      setTimeframe: (tf) => set(state => { state.timeframe = tf }),

      // ── Account ────────────────────────────────────────────────────────────
      account: { ...DEFAULT_ACCOUNT },
      resetAccount: (overrides) => set(state => {
        state.account = { ...DEFAULT_ACCOUNT, ...overrides }
        state.trades  = []
      }),
      updateAccount: (patch) => set(state => {
        Object.assign(state.account, patch)
      }),

      // ── Indicators ────────────────────────────────────────────────────────
      indicators: { ...DEFAULT_INDICATORS },
      toggleIndicator: (key) => set(state => {
        state.indicators[key] = !state.indicators[key]
      }),
      setIndicators: (patch) => set(state => {
        Object.assign(state.indicators, patch)
      }),

      // ── Drawing Tool ──────────────────────────────────────────────────────
      selectedTool: 'cursor',
      setSelectedTool: (t) => set(state => { state.selectedTool = t }),

      // ── Drawings ──────────────────────────────────────────────────────────
      drawings: [],
      addDrawing: (d)  => set(state => { state.drawings.push(d) }),
      clearDrawings: () => set(state => { state.drawings = [] }),
      removeDrawing: (id) => set(state => {
        state.drawings = state.drawings.filter(d => d.id !== id)
      }),

      // ── Trades ────────────────────────────────────────────────────────────
      trades: [],

      openTrade: (tradeData) => set(state => {
        const trade = {
          id:         Date.now(),
          createdAt:  Date.now(),
          exitPrice:  null,
          exitTime:   null,
          pnl:        null,
          rr:         null,
          ...tradeData,
        }
        state.trades.push(trade)
      }),

      closeTrade: (tradeId, exitPrice, exitTime) => set(state => {
        const trade = state.trades.find(t => t.id === tradeId)
        if (!trade || trade.exitPrice != null) return

        const direction = trade.type === 'long' ? 1 : -1
        const pips = direction * (exitPrice - trade.entryPrice)
        const pnl  = pips * trade.lotSize * 100_000
        const slDist = Math.abs(trade.entryPrice - (trade.sl || trade.entryPrice)) || 0.0001
        const tpDist = trade.tp ? Math.abs(trade.tp - trade.entryPrice) : 0
        const rr     = tpDist ? (tpDist / slDist).toFixed(2) : '0'

        trade.exitPrice = exitPrice
        trade.exitTime  = exitTime
        trade.pnl       = pnl
        trade.rr        = rr
      }),

      clearTrades: () => set(state => { state.trades = [] }),

      // ── Derived: closed trades ─────────────────────────────────────────────
      get closedTrades() { return get().trades.filter(t => t.exitPrice != null) },
      get openPositions() { return get().trades.filter(t => t.exitPrice == null) },

      // ── UI state (not persisted) ───────────────────────────────────────────
      activeRightPanel: 'order',
      setActiveRightPanel: (p) => set(state => { state.activeRightPanel = p }),
      activeBottomTab: 'journal',
      setActiveBottomTab: (t) => set(state => { state.activeBottomTab = t }),
      dataSource: null,
      setDataSource: (s) => set(state => { state.dataSource = s }),
    })),
    {
      name:    'backtester-pro-session',
      version: 1,
      // Only persist these keys
      partialize: (state) => ({
        symbol:     state.symbol,
        timeframe:  state.timeframe,
        account:    state.account,
        indicators: state.indicators,
        trades:     state.trades,
        drawings:   state.drawings,
      }),
    }
  )
)

// ── Selector helpers (minimise re-renders) ────────────────────────────────────
export const selectSymbol      = s => s.symbol
export const selectTimeframe   = s => s.timeframe
export const selectAccount     = s => s.account
export const selectIndicators  = s => s.indicators
export const selectTrades      = s => s.trades
export const selectDrawings    = s => s.drawings
export const selectSelectedTool = s => s.selectedTool
