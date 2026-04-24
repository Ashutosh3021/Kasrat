import { useNavigate } from 'react-router-dom'
import { ChevronRight, Minus, Plus } from 'lucide-react'
import TopBar from '../components/TopBar'
import Toggle from '../components/Toggle'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'
import WhatsNewDialog from '../overlays/WhatsNewDialog'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()
  const { openWhatsNew, whatsNewDialogOpen, closeWhatsNew } = useUIStore()

  return (
    <div className="min-h-screen bg-black pb-8 pt-14">
      <TopBar showSettings={false} />
      <main className="pt-10 pb-8 px-4 max-w-2xl mx-auto flex flex-col gap-8">
        <div className="px-2">
          <h2 className="text-[32px] font-bold leading-10 tracking-tight text-white mb-2">Settings</h2>
        </div>

        {/* Appearance */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#c2c6d6] uppercase tracking-widest px-4">Appearance</h3>
          <div className="bg-[#1f1f21] rounded-lg flex flex-col overflow-hidden">
            <button onClick={() => navigate('/settings/appearance')} className="flex items-center justify-between h-12 px-3 hover:bg-[#353437]/30 transition-colors">
              <span className="text-[17px] text-white">Theme</span>
              <div className="flex items-center gap-1 text-[#c2c6d6]">
                <span className="text-[17px]">Dark</span>
                <ChevronRight size={20} />
              </div>
            </button>
            <hr className="border-t border-[#353437] ml-4" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] text-white">System Colors</span>
              <Toggle checked={settings.systemColors} onChange={v => updateSetting('systemColors', v)} />
            </div>
            <hr className="border-t border-[#353437] ml-4" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] text-white">Curve Lines</span>
              <Toggle checked={settings.curveLines} onChange={v => updateSetting('curveLines', v)} />
            </div>
            <hr className="border-t border-[#353437] ml-4" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] text-white">Hide Categories</span>
              <Toggle checked={settings.hideCategories} onChange={v => updateSetting('hideCategories', v)} />
            </div>
          </div>
        </section>

        {/* Data & Format */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#c2c6d6] uppercase tracking-widest px-4">Data & Format</h3>
          <div className="bg-[#1f1f21] rounded-lg flex flex-col overflow-hidden">
            <button onClick={() => navigate('/settings/data')} className="flex items-center justify-between h-12 px-3 hover:bg-[#353437]/30 transition-colors">
              <span className="text-[17px] text-white">Units</span>
              <div className="flex items-center gap-1 text-[#c2c6d6]">
                <span className="text-[17px]">{settings.strengthUnit} / {settings.cardioUnit}</span>
                <ChevronRight size={20} />
              </div>
            </button>
            <hr className="border-t border-[#353437] ml-4" />
            <button onClick={() => navigate('/settings/format')} className="flex items-center justify-between h-12 px-3 hover:bg-[#353437]/30 transition-colors">
              <span className="text-[17px] text-white">Date & Time Format</span>
              <div className="flex items-center gap-1 text-[#c2c6d6]">
                <span className="text-[17px] text-sm truncate max-w-[140px]">{settings.longDateFormat}</span>
                <ChevronRight size={20} />
              </div>
            </button>
            <hr className="border-t border-[#353437] ml-4" />
            <button onClick={() => navigate('/body-measurements')} className="flex items-center justify-between h-12 px-3 hover:bg-[#353437]/30 transition-colors">
              <span className="text-[17px] text-white">Body Measurements</span>
              <ChevronRight size={20} className="text-[#c2c6d6]" />
            </button>
            <hr className="border-t border-[#353437] ml-4" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] text-white">Max Sets Default</span>
              <div className="flex items-center gap-4 bg-[#353437] rounded-full px-3 py-1">
                <button onClick={() => updateSetting('maxSets', Math.max(1, settings.maxSets - 1))} className="text-[#adc6ff]">
                  <Minus size={18} />
                </button>
                <span className="text-[15px] font-semibold text-white w-4 text-center">{settings.maxSets}</span>
                <button onClick={() => updateSetting('maxSets', settings.maxSets + 1)} className="text-[#adc6ff]">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#c2c6d6] uppercase tracking-widest px-4">Plans</h3>
          <div className="bg-[#1f1f21] rounded-lg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] text-white">Show Reorder Handles</span>
              <Toggle checked={settings.showReorderHandles} onChange={v => updateSetting('showReorderHandles', v)} />
            </div>
            <hr className="border-t border-[#353437] ml-4" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] text-white">Show Plan Counts</span>
              <Toggle checked={settings.showPlanCounts} onChange={v => updateSetting('showPlanCounts', v)} />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#c2c6d6] uppercase tracking-widest px-4">Tabs</h3>
          <div className="bg-[#1f1f21] rounded-lg flex flex-col overflow-hidden">
            <button onClick={() => navigate('/settings/tabs')} className="flex items-center justify-between py-3 px-3 hover:bg-[#353437]/30 transition-colors min-h-[48px]">
              <span className="text-[17px] text-white shrink-0 mr-4">Hidden Tabs</span>
              <div className="flex items-center justify-end gap-2 flex-wrap">
                {settings.hiddenTabs.split(',').filter(Boolean).map(t => (
                  <span key={t} className="bg-[#353437] text-[#c2c6d6] text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full">{t}</span>
                ))}
                <ChevronRight size={20} className="text-[#c2c6d6] ml-1" />
              </div>
            </button>
          </div>
        </section>

        {/* Workout */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#c2c6d6] uppercase tracking-widest px-4">Workout</h3>
          <div className="bg-[#1f1f21] rounded-lg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] text-white">Rest Timers</span>
              <Toggle checked={settings.restTimers} onChange={v => updateSetting('restTimers', v)} />
            </div>
            <hr className="border-t border-[#353437] ml-4" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] text-white">Vibrate on Alarm</span>
              <Toggle checked={settings.vibrate} onChange={v => updateSetting('vibrate', v)} />
            </div>
            <hr className="border-t border-[#353437] ml-4" />
            <button onClick={() => navigate('/settings/timer')} className="flex items-center justify-between h-12 px-3 hover:bg-[#353437]/30 transition-colors">
              <span className="text-[17px] text-white">Timer Settings</span>
              <ChevronRight size={20} className="text-[#c2c6d6]" />
            </button>
          </div>
        </section>

        {/* About */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#c2c6d6] uppercase tracking-widest px-4">About</h3>
          <div className="bg-[#1f1f21] rounded-lg flex flex-col overflow-hidden">
            <button onClick={openWhatsNew} className="flex items-center justify-between h-12 px-3 hover:bg-[#353437]/30 transition-colors">
              <span className="text-[17px] text-white">What's New</span>
              <ChevronRight size={20} className="text-[#c2c6d6]" />
            </button>
            <hr className="border-t border-[#353437] ml-4" />
            <button onClick={() => navigate('/about')} className="flex items-center justify-between h-12 px-3 hover:bg-[#353437]/30 transition-colors">
              <span className="text-[17px] text-white">About KASRAT</span>
              <span className="text-[17px] text-[#c2c6d6]">1.0.0</span>
            </button>
          </div>
        </section>
      </main>

      {whatsNewDialogOpen && <WhatsNewDialog onClose={closeWhatsNew} />}
    </div>
  )
}
