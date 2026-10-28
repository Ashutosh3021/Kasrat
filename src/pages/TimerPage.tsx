import { useEffect } from 'react'
import { Square, Pause, Play, RotateCcw } from 'lucide-react'
import TopBar from '../components/TopBar'
import { useTimer } from '../hooks/useTimer'
import { useSettingsStore } from '../store/settingsStore'
import { formatSeconds } from '../utils/dateUtils'

const SIZE = 300
const CENTER = SIZE / 2
const RADIUS = 132
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const PRESETS = [60, 120, 180, 300]

export default function TimerPage() {
  const { settings } = useSettingsStore()
  const { duration, remaining, running, start, pause, stop, addMinute, setDuration } = useTimer()

  useEffect(() => {
    setDuration(settings.timerDuration)
  }, [settings.timerDuration, setDuration])

  const progress = duration > 0 ? remaining / duration : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const state = running ? 'running' : remaining === 0 ? 'done' : remaining < duration ? 'paused' : 'ready'

  const status =
    state === 'running'
      ? { label: 'Running', className: 'chip chip-success' }
      : state === 'paused'
        ? { label: 'Paused', className: 'chip chip-warning' }
        : state === 'done'
          ? { label: 'Complete', className: 'chip chip-accent' }
          : { label: 'Ready', className: 'chip' }

  return (
    <div className="page flex flex-col pt-14">
      <TopBar />
      <main className="page-main flex flex-1 flex-col items-center pb-10">
        <div className="mt-4 w-full text-center">
          <p className="kicker">Rest timer</p>
          <h1 className="display mt-2 text-[32px] text-ink">Breathe. Then work.</h1>
          <p className="mx-auto mt-2 max-w-[32ch] text-[13px] leading-relaxed text-muted">
            Set the clock, step away from the bar, and come back ready for the next set.
          </p>
        </div>

        <div className="relative mt-8 aspect-square w-[min(78vw,19rem)]">
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={`${formatSeconds(remaining)} remaining`}
          >
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--color-line)" strokeWidth="7" />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="var(--color-accent-soft)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 700ms linear' }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[clamp(4rem,19vw,5.5rem)] font-extrabold leading-none tracking-[-0.07em] text-ink tnum">
              {formatSeconds(remaining)}
            </span>
            <span className={`${status.className} mt-4`}>{status.label}</span>
          </div>
        </div>

        <div className="mt-9 flex w-full max-w-sm items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={stop}
              className="icon-btn h-14 w-14 rounded-full"
              aria-label="Stop and reset timer"
            >
              <Square size={19} strokeWidth={1.8} fill="currentColor" />
            </button>
            <span className="mono text-[9px] uppercase tracking-[0.12em] text-muted">Reset</span>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={() => (running ? pause() : start())}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_18px_46px_-18px_rgba(198,58,25,0.9)] transition-transform hover:bg-accent-hover active:scale-95"
              aria-label={running ? 'Pause timer' : 'Start timer'}
            >
              {running ? (
                <Pause size={30} strokeWidth={1.8} fill="currentColor" />
              ) : (
                <Play size={30} strokeWidth={1.8} fill="currentColor" className="ml-1" />
              )}
            </button>
            <span className="text-[12px] font-semibold text-ink">{running ? 'Pause' : 'Start'}</span>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={addMinute}
              className="icon-btn h-14 w-14 rounded-full text-accent-soft"
              aria-label="Add one minute"
            >
              <span className="font-display text-[17px] font-bold">+1</span>
            </button>
            <span className="mono text-[9px] uppercase tracking-[0.12em] text-muted">Minute</span>
          </div>
        </div>

        <section className="mt-9 w-full max-w-sm">
          <div className="flex items-center justify-between px-1">
            <p className="kicker">Quick set</p>
            <button
              type="button"
              onClick={() => setDuration(settings.timerDuration)}
              className="flex items-center gap-1.5 text-[10px] font-medium text-muted transition-colors hover:text-ink"
            >
              <RotateCcw size={11} />
              Default {formatSeconds(settings.timerDuration)}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {PRESETS.map(preset => {
              const active = duration === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDuration(preset)}
                  aria-pressed={active}
                  className={`flex h-11 items-center justify-center rounded-xl border text-[13px] font-semibold transition-colors ${
                    active
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {preset / 60}m
                </button>
              )
            })}
          </div>
        </section>

        <p className="mono mt-7 text-center text-[9px] uppercase tracking-[0.16em] text-muted-dim">
          {Math.floor(duration / 60)} min {duration % 60 > 0 ? `${duration % 60} sec · ` : '· '}
          alarm on
        </p>
      </main>
    </div>
  )
}
