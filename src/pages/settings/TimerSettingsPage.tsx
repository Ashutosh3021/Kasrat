import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Toggle from '../../components/Toggle'
import { useSettingsStore } from '../../store/settingsStore'
import { formatSeconds } from '../../utils/dateUtils'

const RADIUS = 46
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function TimerSettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()

  const progress = settings.timerDuration / 600
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="fixed top-0 left-0 w-full z-50 bg-black border-b border-neutral-900 flex items-center justify-between h-14 px-3">
        <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-[#3B82F6] p-2 -ml-2">
          <ArrowLeft size={24} strokeWidth={1.5} />
        </button>
        <span className="text-xl font-black italic tracking-tighter text-[#3B82F6] absolute left-1/2 -translate-x-1/2">KASRAT</span>
        <div className="w-8" />
      </header>

      <main className="pt-24 px-3 pb-12 max-w-[390px] mx-auto flex flex-col gap-8 w-full">
        <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-white">Timer Settings</h1>

        <section>
          <div className="bg-[#1C1C1E] rounded-[4px] p-3 flex items-center justify-between">
            <div>
              <p className="text-[17px] text-white">Rest Timers Enabled</p>
              <p className="text-[13px] font-medium text-[#A1A1A6] mt-1">Master switch for all workout timers</p>
            </div>
            <Toggle checked={settings.restTimers} onChange={v => updateSetting('restTimers', v)} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-semibold text-white">Default Duration</h2>
          <div className="bg-[#1C1C1E] rounded-[4px] p-6 flex flex-col items-center gap-6">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle className="stroke-[#2C2C2E]" cx="50" cy="50" fill="none" r={RADIUS} strokeWidth="4" />
                <circle
                  cx="50" cy="50" fill="none" r={RADIUS}
                  stroke="#3B82F6"
                  strokeWidth="4"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-[48px] tracking-tighter font-semibold text-white leading-none">
                  {formatSeconds(settings.timerDuration)}
                </span>
                <span className="text-[13px] font-medium text-[#3B82F6] uppercase tracking-widest mt-2">Resting</span>
              </div>
            </div>
            <div className="w-full flex flex-col gap-2">
              <input
                type="range"
                min={30}
                max={600}
                step={15}
                value={settings.timerDuration}
                onChange={e => updateSetting('timerDuration', Number(e.target.value))}
                className="w-full accent-[#3B82F6]"
              />
              <div className="flex justify-between w-full text-[13px] font-medium text-[#A1A1A6]">
                <span>0:30</span>
                <span>10:00</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-semibold text-white">Alerts & Behavior</h2>
          <div className="bg-[#1C1C1E] rounded-[4px] flex flex-col overflow-hidden">
            <div className="p-3 flex items-center justify-between border-b border-[#2C2C2E]">
              <div className="flex items-center gap-3">
                <span className="text-[17px] text-white">Alarm Sound</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[17px] text-[#3B82F6]">{settings.alarmSound}</span>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-4 border-b border-[#2C2C2E]">
              <div className="flex items-center justify-between">
                <span className="text-[17px] text-white">Vibrate on Alarm</span>
                <Toggle checked={settings.vibrate} onChange={v => updateSetting('vibrate', v)} />
              </div>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[17px] text-white">Auto-Start Timer</p>
                <p className="text-[13px] font-medium text-[#A1A1A6] mt-0.5">Begin automatically when logging sets</p>
              </div>
              <Toggle checked={settings.autoStartTimer} onChange={v => updateSetting('autoStartTimer', v)} />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
