import { useState, useMemo } from 'react'
import { useStore } from '@store'
import { fmtPrice } from '@utils/format'

export default function OrderPanel({ lastPrice, replayIndex, bars }) {
  const [side,    setSide]    = useState('long')
  const [lotSize, setLotSize] = useState('0.1')
  const [sl,      setSl]      = useState('')
  const [tp,      setTp]      = useState('')

  const { account, openTrade, symbol } = useStore(s => ({
    account:   s.account,
    openTrade: s.openTrade,
    symbol:    s.symbol,
  }))

  const price = lastPrice ?? 0

  const margin = useMemo(() => {
    const lot = parseFloat(lotSize) || 0
    return ((lot * price * 100_000) / account.leverage).toFixed(2)
  }, [lotSize, price, account.leverage])

  const riskUsd = useMemo(() => {
    const lot  = parseFloat(lotSize) || 0
    const slP  = parseFloat(sl) || 0
    if (!slP || !price) return null
    return Math.abs((price - slP) * lot * 100_000).toFixed(2)
  }, [lotSize, price, sl])

  const commission = useMemo(() => {
    const lot = parseFloat(lotSize) || 0
    return (account.commission * lot * 100_000).toFixed(2)
  }, [lotSize, account.commission])

  const handleExecute = () => {
    const idx = replayIndex !== null ? replayIndex : (bars?.length ?? 1) - 1
    const bar = bars?.[idx]
    if (!bar) return
    openTrade({
      symbol,
      type:       side,
      entryPrice: bar.close,
      entryTime:  bar.time,
      lotSize:    parseFloat(lotSize) || 0.1,
      sl:         parseFloat(sl)      || null,
      tp:         parseFloat(tp)      || null,
    })
    setSl(''); setTp('')
  }

  const inputCls = `
    w-full bg-tv-bg border border-tv-border rounded px-2 py-1.5
    text-tv-text font-mono text-xs focus:outline-none focus:border-tv-blue
    placeholder-tv-dim transition-colors
  `

  return (
    <div className="p-3 space-y-3">
      {/* Buy / Sell toggle */}
      <div className="flex gap-1.5">
        {['long', 'short'].map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`
              flex-1 py-2 rounded text-xs font-bold transition-colors
              ${side === s
                ? s === 'long' ? 'bg-tv-green text-white' : 'bg-tv-red text-white'
                : 'bg-tv-border text-tv-muted hover:text-tv-text'}
            `}
          >
            {s === 'long' ? '▲ BUY' : '▼ SELL'}
          </button>
        ))}
      </div>

      {/* Market price display */}
      <div className="bg-tv-bg border border-tv-border rounded px-3 py-2 text-center">
        <span className="text-tv-muted text-2xs">MARKET PRICE</span>
        <div className="text-tv-text font-mono font-bold text-sm mt-0.5">{fmtPrice(price)}</div>
      </div>

      {/* Inputs */}
      <div>
        <label className="text-tv-muted text-2xs mb-1 block">Lot Size</label>
        <input type="number" className={inputCls} value={lotSize}
          onChange={e => setLotSize(e.target.value)} placeholder="0.01" step="0.01" min="0.01" />
      </div>
      <div>
        <label className="text-tv-muted text-2xs mb-1 block">Stop Loss</label>
        <input type="number" className={inputCls} value={sl}
          onChange={e => setSl(e.target.value)}
          placeholder={price ? fmtPrice(price * (side === 'long' ? 0.999 : 1.001)) : ''}
          step="0.00001" />
      </div>
      <div>
        <label className="text-tv-muted text-2xs mb-1 block">Take Profit</label>
        <input type="number" className={inputCls} value={tp}
          onChange={e => setTp(e.target.value)}
          placeholder={price ? fmtPrice(price * (side === 'long' ? 1.002 : 0.998)) : ''}
          step="0.00001" />
      </div>

      {/* Trade info */}
      <div className="bg-tv-bg border border-tv-border rounded px-3 py-2 space-y-1.5">
        <Row label="Margin"     value={`$${margin}`} />
        <Row label="Risk $"     value={riskUsd ? `$${riskUsd}` : '—'} valueColor="text-tv-red" />
        <Row label="Commission" value={`$${commission}`} />
        <Row label="Leverage"   value={`1:${account.leverage}`} valueColor="text-tv-yellow" />
      </div>

      {/* Execute */}
      <button
        onClick={handleExecute}
        disabled={!price}
        className={`
          w-full py-2.5 rounded font-bold text-sm text-white transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          ${side === 'long' ? 'bg-tv-green hover:brightness-110' : 'bg-tv-red hover:brightness-110'}
        `}
      >
        Execute {side === 'long' ? 'BUY' : 'SELL'} @ Market
      </button>
    </div>
  )
}

function Row({ label, value, valueColor = 'text-tv-text' }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-tv-muted text-2xs">{label}</span>
      <span className={`font-mono text-xs font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}
