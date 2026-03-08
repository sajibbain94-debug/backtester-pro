import { useStore } from '@store'
import { fmtPrice, fmtPnl } from '@utils/format'

export default function OpenPositions({ lastPrice, replayIndex, bars }) {
  const { trades, closeTrade } = useStore(s => ({
    trades:     s.trades,
    closeTrade: s.closeTrade,
  }))

  const open = trades.filter(t => t.exitPrice == null)

  const handleClose = (id) => {
    const idx = replayIndex !== null ? replayIndex : (bars?.length ?? 1) - 1
    const bar = bars?.[idx]
    if (!bar) return
    closeTrade(id, bar.close, bar.time)
  }

  if (!open.length) {
    return (
      <div className="flex items-center justify-center h-full text-tv-muted text-sm">
        No open positions
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0">
          <tr className="bg-tv-panel">
            {['Symbol','Type','Entry','Current','Lots','Float P&L','Action'].map(h => (
              <th key={h} className="px-2 py-2 text-left text-tv-muted font-semibold border-b border-tv-border whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {open.map(t => {
            const dir = t.type === 'long' ? 1 : -1
            const floatPnl = lastPrice != null
              ? dir * (lastPrice - t.entryPrice) * t.lotSize * 100_000
              : null
            return (
              <tr key={t.id} className="border-b border-tv-border hover:bg-tv-hover transition-colors">
                <td className="px-2 py-1.5 font-bold text-tv-text">{t.symbol}</td>
                <td className={`px-2 py-1.5 font-bold ${t.type === 'long' ? 'text-tv-green' : 'text-tv-red'}`}>
                  {t.type?.toUpperCase()}
                </td>
                <td className="px-2 py-1.5 font-mono text-tv-text">{fmtPrice(t.entryPrice)}</td>
                <td className="px-2 py-1.5 font-mono text-tv-text">{fmtPrice(lastPrice)}</td>
                <td className="px-2 py-1.5 font-mono text-tv-text">{t.lotSize}</td>
                <td className={`px-2 py-1.5 font-mono font-bold ${floatPnl == null ? 'text-tv-muted' : floatPnl >= 0 ? 'text-tv-green' : 'text-tv-red'}`}>
                  {floatPnl != null ? fmtPnl(floatPnl) : '—'}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => handleClose(t.id)}
                    className="px-2 py-0.5 bg-tv-red hover:brightness-110 text-white rounded text-2xs font-bold transition-all"
                  >
                    CLOSE
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
