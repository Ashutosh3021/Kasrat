import { useEffect } from 'react'
import { Square, Pause, Play } from 'lucide-react'
import TopBar from '../components/TopBar'
import { useTimer } from '../hooks/useTimer'
import { useSettingsStore } from '../store/settingsStore'
import { formatSeconds } from '../utils/dateUtils'

const RADIUS = 130
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function TimerPage() {
  const { settings } = useSettingsStore()
  const { duration, remaining, running, start, pause, stop, addMinute, setDuration } = useTimer()

  useEffect(() => {
    setDuration(settings.timerDuration)
  }, [settings.timerDuration, setDuration])

  const progress = duration > 0 ? remaining / duration : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="min-h-screen bg-black pb-24 pt-14 flex flex-col">
      <TopBar />
      <main className="flex-grow flex flex-col items-center justify-center px-4 relative">
        <h2 className="text-[22px] font-semibold text-white absolute top-6"></h2>

        <div className="relative w-[280px] h-[280px] flex items-center justify-center flex-col mt-8 mb-12">
          <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r={RADIUS} fill="none" stroke="#2C2C2E" strokeWidth="8" />
            <circle
              cx="140" cy="140" r={RADIUS}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.4))', transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="z-10 flex flex-col items-center">
            <span className="text-[72px] font-semibold leading-none tracking-tighter text-white tabular-nums">
              {formatSeconds(remaining)}
            </span>
            <span className="text-[13px] font-medium text-[#A1A1A6] mt-2 uppercase tracking-widest">remaining</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mb-8 w-full max-w-sm">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={stop}
              className="w-16 h-16 rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-90 transition-transform"
            >
              <Square size={28} strokeWidth={1.5} fill="white" className="text-white" />
            </button>
            <span className="text-[13px] font-medium text-[#A1A1A6]">Stop</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => running ? pause() : start()}
              className="w-20 h-20 rounded-full bg-[#3B82F6] flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_24px_rgba(59,130,246,0.3)]"
            >
              {running
                ? <Pause size={36} strokeWidth={1.5} fill="white" className="text-white" />
                : <Play size={36} strokeWidth={1.5} fill="white" className="text-white" />
              }
            </button>
            <span className="text-[13px] font-medium text-white">{running ? 'Pause' : 'Start'}</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={addMinute}
              className="w-16 h-16 rounded-full border-2 border-[#3B82F6] flex items-center justify-center active:scale-90 transition-transform bg-transparent"
            >
              <span className="text-[15px] font-medium text-[#3B82F6]">+1</span>
            </button>
            <span className="text-[13px] font-medium text-[#A1A1A6]">+1 min</span>
          </div>
        </div>

        <div className="px-4 py-2 rounded-full bg-[#1C1C1E] border border-[#2C2C2E]">
          <span className="text-[13px] font-medium text-white opacity-80">
            Total: {Math.floor(duration / 60)} min {duration % 60 > 0 ? `${duration % 60} sec` : ''}
          </span>
        </div>
      </main>
    </div>
  )
}
