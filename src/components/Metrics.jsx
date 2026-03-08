import { useMemo } from 'react'
import { useStore } from '@store'
import { fmtPnl } from '@utils/format'

export default function Metrics() {
  const trades = useStore(s => s.trades)

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.exitPrice != null)
    if (!closed.length) return null

    const wins   = closed.filter(t => (t.pnl ?? 0) >= 0)
    const losses = closed.filter(t => (t.pnl ?? 0) <  0)

    const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0)
    const grossLoss   = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0))
    const totalPnl    = grossProfit - grossLoss
    const winRate     = (wins.length / closed.length) * 100
    const pf          = grossLoss > 0 ? grossProfit / grossLoss : Infinity
    const avgRR       = wins.length
      ? wins.reduce((s, t) => s + parseFloat(t.rr ?? 0), 0) / wins.length
      : 0

    // Max drawdown
    let peak = 0, maxDD = 0, cumPnl = 0
    closed.forEach(t => {
      cumPnl += t.pnl ?? 0
      if (cumPnl > peak) peak = cumPnl
      const dd = peak - cumPnl
      if (dd > maxDD) maxDD = dd
    })

    // Consecutive wins/losses
    let maxWinStreak = 0, maxLossStreak = 0, ws = 0, ls = 0
    closed.forEach(t => {
      if ((t.pnl ?? 0) >= 0) { ws++; ls = 0; maxWinStreak  = Math.max(maxWinStreak, ws) }
      else                   { ls++; ws = 0; maxLossStreak = Math.max(maxLossStreak, ls) }
    })

    return {
      totalPnl, winRate, pf, avgRR, maxDD,
      totalTrades: closed.length, wins: wins.length, losses: losses.length,
      grossProfit, grossLoss, maxWinStreak, maxLossStreak,
    }
  }, [trades])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-tv-muted text-sm">
        No closed trades to analyse yet.
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2 overflow-auto h-full">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Wins"   value={stats.wins}   color="text-tv-green" />
        <StatCard label="Losses" value={stats.losses} color="text-tv-red"   />
        <StatCard label="Total"  value={stats.totalTrades} />
      </div>

      {/* Key metrics */}
      <MetricRow label="Net P&L"
        value={fmtPnl(stats.totalPnl)}
        valueColor={stats.totalPnl >= 0 ? 'text-tv-green' : 'text-tv-red'} />
      <MetricRow label="Win Rate"
        value={`${stats.winRate.toFixed(1)}%`}
        valueColor={stats.winRate >= 50 ? 'text-tv-green' : 'text-tv-red'} />
      <MetricRow label="Profit Factor"
        value={isFinite(stats.pf) ? stats.pf.toFixed(2) : '∞'}
        valueColor={stats.pf >= 1 ? 'text-tv-green' : 'text-tv-red'} />
      <MetricRow label="Max Drawdown"
        value={`-$${stats.maxDD.toFixed(2)}`}
        valueColor="text-tv-red" />
      <MetricRow label="Avg R:R"
        value={`1:${stats.avgRR.toFixed(2)}`}
        valueColor="text-tv-yellow" />
      <MetricRow label="Gross Profit"  value={`$${stats.grossProfit.toFixed(2)}`}  valueColor="text-tv-green" />
      <MetricRow label="Gross Loss"    value={`-$${stats.grossLoss.toFixed(2)}`}   valueColor="text-tv-red"   />
      <MetricRow label="Best Streak"   value={`${stats.maxWinStreak}W`}            valueColor="text-tv-green" />
      <MetricRow label="Worst Streak"  value={`${stats.maxLossStreak}L`}           valueColor="text-tv-red"   />
    </div>
  )
}

function StatCard({ label, value, color = 'text-tv-text' }) {
  return (
    <div className="bg-tv-bg border border-tv-border rounded p-2 text-center">
      <div className={`font-bold text-lg font-mono ${color}`}>{value}</div>
      <div className="text-tv-muted text-2xs mt-0.5">{label}</div>
    </div>
  )
}

function MetricRow({ label, value, valueColor = 'text-tv-text' }) {
  return (
    <div className="flex justify-between items-center bg-tv-bg border border-tv-border rounded px-3 py-1.5">
      <span className="text-tv-muted text-xs">{label}</span>
      <span className={`font-mono text-xs font-bold ${valueColor}`}>{value}</span>
    </div>
  )
}
