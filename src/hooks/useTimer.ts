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
      }, 500) // poll at 500ms so wall-clock correction stays responsive
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, tick])

  // TIMER-002: recalculate immediately when tab becomes visible again
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && running) {
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [running, tick])

  useEffect(() => {
    if (remaining === 0 && !alarmPlayedRef.current) {
      alarmPlayedRef.current = true

      if (settings.vibrate && navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300])
      }

      playBeep()
      showNotification()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, settings.vibrate])

  return useTimerStore()
}

// TIMER-003: singleton AudioContext — never create more than one per page
let _audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContext()
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume()
  }
  return _audioCtx
}

function playBeep() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.frequency.value = 880
    osc1.type = 'sine'
    gain1.gain.setValueAtTime(0.4, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
    osc1.start(now)
    osc1.stop(now + 1.0)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.frequency.value = 1100
    osc2.type = 'sine'
    gain2.gain.setValueAtTime(0.4, now + 0.3)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1)
    osc2.start(now + 0.3)
    osc2.stop(now + 1.1)
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
