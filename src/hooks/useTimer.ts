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

      // Vibrate
      if (settings.vibrate && navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300])
      }

      // Play beep
      playBeep()

      // Browser notification
      showNotification()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.0)
    // Second beep
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.frequency.value = 1100
    osc2.type = 'sine'
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.3)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1)
    osc2.start(ctx.currentTime + 0.3)
    osc2.stop(ctx.currentTime + 1.1)
  } catch (_) {}
}

async function showNotification() {
  if (!('Notification' in window)) return
  try {
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission === 'granted') {
      new Notification('Rest timer finished', {
        body: 'Time to get back to it.',
        icon: '/Assets/icons/icon-192x192.png',
        tag: 'kasrat-timer',
      })
    }
  } catch (_) {}
}
