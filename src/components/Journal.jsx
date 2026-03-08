import { useStore } from '@store'
import { fmtPrice, fmtDateTime, fmtPnl } from '@utils/format'

export default function Journal() {
  const trades = useStore(s => s.trades)

  if (!trades.length) {
    return (
      <div className="flex items-center justify-center h-full text-tv-muted text-sm">
        No trades recorded yet. Use Bar Replay mode to execute trades.
      </div>
    )
  }

  const cols = ['#','Symbol','Type','Entry','Exit','SL','TP','Lots','P&L','R:R','Status']

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="bg-tv-panel">
            {cols.map(h => (
              <th key={h} className="px-2 py-2 text-left text-tv-muted font-semibold whitespace-nowrap border-b border-tv-border">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...trades].reverse().map((t, i) => {
            const isOpen = t.exitPrice == null
            const isWin  = !isOpen && (t.pnl ?? 0) >= 0
            return (
              <tr
                key={t.id}
                className="border-b border-tv-border hover:bg-tv-hover transition-colors"
              >
                <td className="px-2 py-1.5 text-tv-muted font-mono">{trades.length - i}</td>
                <td className="px-2 py-1.5 font-bold text-tv-text">{t.symbol}</td>
                <td className={`px-2 py-1.5 font-bold ${t.type === 'long' ? 'text-tv-green' : 'text-tv-red'}`}>
                  {t.type?.toUpperCase()}
                </td>
                <td className="px-2 py-1.5 font-mono text-tv-text">{fmtPrice(t.entryPrice)}</td>
                <td className="px-2 py-1.5 font-mono text-tv-text">{t.exitPrice ? fmtPrice(t.exitPrice) : '—'}</td>
                <td className="px-2 py-1.5 font-mono text-tv-red">{t.sl ? fmtPrice(t.sl) : '—'}</td>
                <td className="px-2 py-1.5 font-mono text-tv-green">{t.tp ? fmtPrice(t.tp) : '—'}</td>
                <td className="px-2 py-1.5 font-mono text-tv-text">{t.lotSize}</td>
                <td className={`px-2 py-1.5 font-mono font-bold ${isOpen ? 'text-tv-muted' : isWin ? 'text-tv-green' : 'text-tv-red'}`}>
                  {isOpen ? '—' : fmtPnl(t.pnl)}
                </td>
                <td className="px-2 py-1.5 font-mono text-tv-yellow">
                  {t.rr ? `1:${t.rr}` : '—'}
                </td>
                <td className="px-2 py-1.5">
                  <StatusBadge isOpen={isOpen} isWin={isWin} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ isOpen, isWin }) {
  if (isOpen) return (
    <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-blue-500/20 text-tv-blue">OPEN</span>
  )
  return isWin
    ? <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-tv-green/20 text-tv-green">WIN</span>
    : <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-tv-red/20 text-tv-red">LOSS</span>
}
