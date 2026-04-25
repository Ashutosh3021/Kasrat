import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import Toggle from '../../components/Toggle'
import { useSettingsStore } from '../../store/settingsStore'

export default function FormatSettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()

  const today = new Date()
  const longPreview = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const shortPreview = today.toLocaleDateString('en-US')

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-3 h-16 bg-black border-b border-zinc-800">
        <button onClick={() => navigate(-1)} className="text-[#3B82F6] hover:opacity-80 p-2 -ml-2 rounded-[2px]">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="font-semibold text-xl text-white absolute left-1/2 -translate-x-1/2">Format</h1>
        <div className="w-10" />
      </header>

      <main className="pt-20 px-3 pb-8 max-w-2xl mx-auto flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest pl-1">Date & Time</h2>
          <div className="bg-[#1C1C1E] rounded-[4px] border border-[#2C2C2E] overflow-hidden">
            <button className="w-full flex items-center justify-between p-3 border-b border-[#2C2C2E] hover:bg-[#2C2C2E] transition-colors">
              <div className="flex flex-col items-start text-left">
                <span className="text-[17px] text-white">Long Date Format</span>
                <span className="text-[13px] font-medium text-[#A1A1A6] mt-1">{longPreview}</span>
              </div>
              <ChevronRight size={20} strokeWidth={1.5} className="text-[#A1A1A6]" />
            </button>
            <button className="w-full flex items-center justify-between p-3 border-b border-[#2C2C2E] hover:bg-[#2C2C2E] transition-colors">
              <div className="flex flex-col items-start text-left">
                <span className="text-[17px] text-white">Short Date Format</span>
                <span className="text-[13px] font-medium text-[#A1A1A6] mt-1">{shortPreview}</span>
              </div>
              <ChevronRight size={20} strokeWidth={1.5} className="text-[#A1A1A6]" />
            </button>
            <div className="flex items-center justify-between p-3 border-b border-[#2C2C2E]">
              <div className="flex flex-col">
                <span className="text-[17px] text-white">Relative Time</span>
                <span className="text-[13px] font-medium text-[#A1A1A6] mt-1">e.g., "2h ago" instead of "14:30"</span>
              </div>
              <Toggle checked={settings.relativeTime} onChange={v => updateSetting('relativeTime', v)} />
            </div>
            <div className="flex items-center justify-between p-3">
              <div className="flex flex-col">
                <span className="text-[17px] text-white">Use 24-hour time</span>
                <span className="text-[13px] font-medium text-[#A1A1A6] mt-1">13:00 vs 1:00 PM</span>
              </div>
              <Toggle checked={settings.use24Hour} onChange={v => updateSetting('use24Hour', v)} />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
