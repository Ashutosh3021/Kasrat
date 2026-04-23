import { useEffect, useRef } from 'react'
import { useTimerStore } from '../store/timerStore'
import { useSettingsStore } from '../store/settingsStore'

export function useTimer() {
  const { running, remaining, tick } = useTimerStore()
  const { settings } = useSettingsStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmPlayedRef = useRef(false)

  useEffect(() => {
    if (running) {
      alarmPlayedRef.current = false
      intervalRef.current = setInterval(() => {
        tick()
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, tick])

  useEffect(() => {
    if (remaining === 0 && !alarmPlayedRef.current) {
      alarmPlayedRef.current = true
      if (settings.vibrate && navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
      playBeep()
    }
  }, [remaining, settings.vibrate])

  return useTimerStore()
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  } catch (_) {}
}
