import { useState } from 'react'
import { useStore } from '@store'
import { ASSETS, TIMEFRAMES, DEFAULT_INDICATORS } from '@utils/constants'

export default function Toolbar({ lastPrice, dataSource, onRefresh }) {
  const [showAssets, setShowAssets] = useState(false)
  const [showIndicators, setShowIndicators] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  const {
    symbol, setSymbol, timeframe, setTimeframe,
    indicators, toggleIndicator,
    account, resetAccount, updateAccount,
  } = useStore(s => ({
    symbol:       s.symbol,    setSymbol:    s.setSymbol,
    timeframe:    s.timeframe, setTimeframe: s.setTimeframe,
    indicators:   s.indicators, toggleIndicator: s.toggleIndicator,
    account:      s.account,   resetAccount: s.resetAccount, updateAccount: s.updateAccount,
  }))

  const equity = useStore(s => {
    const closed = s.trades.filter(t => t.exitPrice != null)
    return s.account.balance + closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  })

  return (
    <div className="flex items-center gap-2 px-3 h-11 bg-tv-panel border-b border-tv-border flex-shrink-0 z-20 relative">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 bg-tv-blue rounded flex items-center justify-center font-black text-white text-sm">B</div>
        <span className="font-bold text-xs tracking-widest text-tv-text hidden sm:block">BACKTESTERPRO</span>
      </div>

      {/* Symbol selector */}
      <div className="relative">
        <button
          onClick={() => { setShowAssets(!showAssets); setShowIndicators(false); setShowAccount(false) }}
          className="flex items-center gap-1.5 bg-tv-border hover:bg-tv-hover px-3 py-1.5 rounded text-xs font-bold text-tv-text transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-tv-blue" />
          {symbol}
          <span className="text-tv-muted text-2xs">▾</span>
        </button>

        {showAssets && (
          <div className="absolute top-full left-0 mt-1 bg-tv-panel border border-tv-border rounded-lg shadow-tv-dropdown z-50 w-52 max-h-80 overflow-auto animate-fade-in py-1">
            {Object.entries(ASSETS).map(([cat, syms]) => (
              <div key={cat}>
                <div className="px-3 py-1 text-2xs text-tv-muted font-semibold uppercase tracking-wider">{cat}</div>
                {syms.map(s => (
                  <button key={s} onClick={() => { setSymbol(s); setShowAssets(false) }}
                    className={`block w-full text-left px-3 py-1 text-xs transition-colors rounded mx-1 ${s === symbol ? 'bg-tv-blue text-white' : 'text-tv-text hover:bg-tv-hover'}`}>
                    {s}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeframe buttons */}
      <div className="flex gap-0.5">
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => setTimeframe(tf)}
            className={`px-2 py-1 rounded text-2xs font-mono transition-colors ${tf === timeframe ? 'bg-tv-blue text-white font-bold' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'}`}>
            {tf}
          </button>
        ))}
      </div>

      {/* Data source badge */}
      {dataSource && (
        <div className={`px-2 py-0.5 rounded text-2xs font-bold border ${
          dataSource === 'live'  ? 'border-tv-green/40 text-tv-green bg-tv-green/10' :
          dataSource === 'cache' ? 'border-tv-blue/40  text-tv-blue  bg-tv-blue/10'  :
          'border-tv-yellow/40 text-tv-yellow bg-tv-yellow/10'
        }`}>
          {dataSource === 'live' ? '⬤ LIVE' : dataSource === 'cache' ? '⬤ CACHED' : '⬤ MOCK'}
        </div>
      )}
      <button onClick={onRefresh} title="Refresh data" className="text-tv-muted hover:text-tv-text transition-colors text-sm">↺</button>

      <div className="flex-1" />

      {/* Indicators */}
      <div className="relative">
        <button onClick={() => { setShowIndicators(!showIndicators); setShowAssets(false); setShowAccount(false) }}
          className="px-2 py-1.5 bg-tv-border hover:bg-tv-hover rounded text-xs text-tv-text transition-colors">
          ƒx Indicators
        </button>
        {showIndicators && (
          <div className="absolute top-full right-0 mt-1 bg-tv-panel border border-tv-border rounded-lg shadow-tv-dropdown z-50 w-44 py-2 px-2 animate-fade-in">
            {Object.keys(DEFAULT_INDICATORS).map(key => (
              <label key={key} className="flex items-center gap-2 py-1 px-1 cursor-pointer rounded hover:bg-tv-hover transition-colors">
                <input type="checkbox" checked={indicators[key]} onChange={() => toggleIndicator(key)} />
                <span className="text-xs text-tv-text font-mono">{key.toUpperCase()}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Account */}
      <div className="relative">
        <button onClick={() => { setShowAccount(!showAccount); setShowAssets(false); setShowIndicators(false) }}
          className="px-2 py-1.5 bg-tv-border hover:bg-tv-hover rounded text-xs text-tv-text transition-colors">
          ⚙ Account
        </button>
        {showAccount && (
          <AccountModal account={account} onClose={() => setShowAccount(false)} onSave={(v) => { resetAccount(v); setShowAccount(false) }} />
        )}
      </div>

      {/* Equity display */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-tv-border rounded text-xs font-mono">
        <span className="text-tv-muted">Bal</span>
        <span className="text-tv-text font-bold">${account.balance.toLocaleString()}</span>
        <span className="text-tv-muted">Eq</span>
        <span className={`font-bold ${equity >= account.balance ? 'text-tv-green' : 'text-tv-red'}`}>
          ${equity.toFixed(2)}
        </span>
        <span className="text-tv-muted">Lvg</span>
        <span className="text-tv-yellow font-bold">1:{account.leverage}</span>
      </div>
    </div>
  )
}

function AccountModal({ account, onClose, onSave }) {
  const [bal, setBal] = useState(account.balance)
  const [lvg, setLvg] = useState(account.leverage)
  const [com, setCom] = useState(account.commission)

  const inputCls = "w-full bg-tv-bg border border-tv-border rounded px-3 py-2 text-tv-text font-mono text-sm focus:outline-none focus:border-tv-blue"

  return (
    <div className="absolute top-full right-0 mt-1 bg-tv-panel border border-tv-border rounded-xl shadow-tv-dropdown z-50 w-72 p-4 animate-slide-up">
      <h3 className="text-sm font-bold text-tv-text mb-3">Demo Account Setup</h3>
      <div className="space-y-3">
        <Field label="Starting Balance ($)">
          <input type="number" className={inputCls} value={bal} onChange={e => setBal(+e.target.value)} />
        </Field>
        <Field label="Leverage (e.g. 100 = 1:100)">
          <input type="number" className={inputCls} value={lvg} onChange={e => setLvg(+e.target.value)} min="1" max="500" />
        </Field>
        <Field label="Commission (per unit, e.g. 0.0001)">
          <input type="number" className={inputCls} value={com} onChange={e => setCom(+e.target.value)} step="0.00001" />
        </Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 py-2 rounded bg-tv-border text-tv-text text-xs font-semibold hover:bg-tv-hover transition-colors">Cancel</button>
        <button onClick={() => onSave({ balance: bal, leverage: lvg, commission: com })}
          className="flex-1 py-2 rounded bg-tv-blue text-white text-xs font-bold hover:brightness-110 transition-all">
          Apply & Reset
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-2xs text-tv-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}
