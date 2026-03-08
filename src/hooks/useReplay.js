import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useReplay — manages the bar-replay state machine.
 *
 * States:
 *   idle     → replayIndex is null (showing full chart)
 *   paused   → replayIndex set, isPlaying=false
 *   playing  → advancing at `speed` ms per bar
 *   finished → replayIndex === totalBars - 1
 *
 * @param {number} totalBars
 * @returns {object}
 */
export function useReplay(totalBars) {
  const [replayIndex, setReplayIndex]   = useState(null)   // null = disabled
  const [isPlaying,   setIsPlaying]     = useState(false)
  const [speed,       setSpeed]         = useState(500)    // ms between bars
  const intervalRef = useRef(null)

  // ── Advance one bar ────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setReplayIndex(prev => {
      if (prev === null) return null
      if (prev >= totalBars - 1) {
        setIsPlaying(false)
        return prev
      }
      return prev + 1
    })
  }, [totalBars])

  // ── Interval management ────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(intervalRef.current)
    if (isPlaying) {
      intervalRef.current = setInterval(tick, speed)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, speed, tick])

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Set the replay start point to a specific bar index */
  const setStart = useCallback((index) => {
    const idx = Math.max(0, Math.min(index, totalBars - 1))
    setReplayIndex(idx)
    setIsPlaying(false)
  }, [totalBars])

  /** Set replay to 50% of the data */
  const setStartMidpoint = useCallback(() => {
    setStart(Math.floor(totalBars * 0.5))
  }, [setStart, totalBars])

  const play  = useCallback(() => {
    if (replayIndex === null) setReplayIndex(Math.floor(totalBars * 0.5))
    setIsPlaying(true)
  }, [replayIndex, totalBars])

  const pause = useCallback(() => setIsPlaying(false), [])

  const stepForward = useCallback(() => {
    setIsPlaying(false)
    tick()
  }, [tick])

  const stepBackward = useCallback(() => {
    setIsPlaying(false)
    setReplayIndex(prev => (prev === null ? null : Math.max(0, prev - 1)))
  }, [])

  /** Exit replay — return to live / full chart */
  const jumpToEnd = useCallback(() => {
    setIsPlaying(false)
    setReplayIndex(null)
  }, [])

  const isIdle     = replayIndex === null
  const isFinished = replayIndex !== null && replayIndex >= totalBars - 1

  return {
    replayIndex,
    isPlaying,
    isIdle,
    isFinished,
    speed,
    setSpeed,
    setStart,
    setStartMidpoint,
    play,
    pause,
    stepForward,
    stepBackward,
    jumpToEnd,
  }
}
