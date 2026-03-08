import { fmtDateTime, fmtPrice } from '@utils/format'

export default function ReplayBar({ replay, bars, lastBar }) {
  const {
    replayIndex, isPlaying, isIdle, isFinished, speed,
    setSpeed, setStartMidpoint, play, pause,
    stepForward, stepBackward, jumpToEnd,
  } = replay

  const barInfo = lastBar ?? {}
  const progress = replayIndex != null && bars?.length
    ? Math.round((replayIndex / bars.length) * 100)
    : null

  return (
    <div className="flex items-center gap-2 px-3 h-9 bg-tv-bg border-b border-tv-border flex-shrink-0">
      {/* Label */}
      <span className="text-tv-muted text-2xs font-semibold tracking-wider whitespace-nowrap">BAR REPLAY</span>

      {/* Set start */}
      <button onClick={setStartMidpoint}
        className="px-2 py-1 bg-tv-border hover:bg-tv-hover rounded text-2xs text-tv-yellow font-bold transition-colors whitespace-nowrap">
        ⊢ Set Start
      </button>

      {/* Play/Pause */}
      <button
        onClick={isPlaying ? pause : play}
        className={`px-3 py-1 rounded text-xs font-bold transition-all ${isPlaying ? 'bg-tv-red hover:brightness-110' : 'bg-tv-green hover:brightness-110'} text-white`}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      {/* Step back */}
      <button onClick={stepBackward} disabled={isIdle}
        className="px-2 py-1 bg-tv-border rounded text-xs text-tv-text disabled:opacity-40 hover:bg-tv-hover transition-colors">
        ◁ -1
      </button>

      {/* Step forward */}
      <button onClick={stepForward}
        className="px-2 py-1 bg-tv-border rounded text-xs text-tv-text hover:bg-tv-hover transition-colors">
        +1 ▷
      </button>

      {/* Jump to end */}
      <button onClick={jumpToEnd} disabled={isIdle}
        className="px-2 py-1 bg-tv-border rounded text-2xs text-tv-blue disabled:opacity-40 hover:bg-tv-hover transition-colors whitespace-nowrap">
        ⊳| Live
      </button>

      {/* Speed */}
      <div className="flex items-center gap-1.5 ml-1">
        <span className="text-tv-muted text-2xs whitespace-nowrap">Speed</span>
        <input type="range" min="100" max="2000" step="100" value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="w-20" />
        <span className="text-tv-text text-2xs font-mono w-8">{(speed / 1000).toFixed(1)}s</span>
      </div>

      {/* Position info */}
      {!isIdle && (
        <div className="flex items-center gap-2 ml-2 text-2xs font-mono">
          <span className="text-tv-yellow">📍 {fmtDateTime(lastBar?.time)}</span>
          <span className="text-tv-muted">Bar {replayIndex}/{bars?.length}</span>
          {progress != null && (
            <div className="w-20 h-1 bg-tv-border rounded-full overflow-hidden">
              <div className="h-full bg-tv-blue transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* OHLCV display */}
      {lastBar && (
        <div className="flex items-center gap-2 text-2xs font-mono">
          <OHLCItem label="O" value={fmtPrice(barInfo.open)} />
          <OHLCItem label="H" value={fmtPrice(barInfo.high)} color="text-tv-green" />
          <OHLCItem label="L" value={fmtPrice(barInfo.low)}  color="text-tv-red"   />
          <OHLCItem label="C" value={fmtPrice(barInfo.close)} color="text-tv-text font-bold" />
          <span className="text-tv-muted">V: {Math.round(barInfo.volume ?? 0).toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}

function OHLCItem({ label, value, color = 'text-tv-text' }) {
  return (
    <span>
      <span className="text-tv-muted">{label}: </span>
      <span className={color}>{value}</span>
    </span>
  )
}
