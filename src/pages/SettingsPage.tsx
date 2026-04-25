import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Minus, Plus } from 'lucide-react'
import TopBar from '../components/TopBar'
import Toggle from '../components/Toggle'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'
import WhatsNewDialog from '../overlays/WhatsNewDialog'
import { restoreDefaultExercises } from '../db/defaults'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()
  const { openWhatsNew, whatsNewDialogOpen, closeWhatsNew } = useUIStore()
  const [restoreMessage, setRestoreMessage] = useState('')

  async function handleRestoreExercises() {
    await restoreDefaultExercises()
    setRestoreMessage('Default exercises restored')
    setTimeout(() => setRestoreMessage(''), 3000)
  }

  return (
    <div className="min-h-screen bg-black pb-8 pt-14">
      <TopBar showSettings={false} />
      <main className="pt-10 pb-8 px-4 max-w-2xl mx-auto flex flex-col gap-8">
        <div className="px-2">
          <h2 className="text-[32px] font-medium leading-10 text-white mb-2">Settings</h2>
        </div>

        {/* Appearance */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Appearance</h3>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col overflow-hidden" style={{ borderRadius: '4px' }}>
            <button onClick={() => navigate('/settings/appearance')} className="flex items-center justify-between h-12 px-3 hover:bg-[#2a2a2c] transition-colors">
              <span className="text-[17px] font-normal text-white">Theme</span>
              <div className="flex items-center gap-1 text-[#A1A1A6]">
                <span className="text-[15px]">Dark</span>
                <ChevronRight size={18} strokeWidth={1.5} />
              </div>
            </button>
            <hr className="border-t border-[#2C2C2E]" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] font-normal text-white">System Colors</span>
              <Toggle checked={settings.systemColors} onChange={v => updateSetting('systemColors', v)} />
            </div>
            <hr className="border-t border-[#2C2C2E]" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] font-normal text-white">Curve Lines</span>
              <Toggle checked={settings.curveLines} onChange={v => updateSetting('curveLines', v)} />
            </div>
            <hr className="border-t border-[#2C2C2E]" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] font-normal text-white">Hide Categories</span>
              <Toggle checked={settings.hideCategories} onChange={v => updateSetting('hideCategories', v)} />
            </div>
          </div>
        </section>

        {/* Data & Format */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Data & Format</h3>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col overflow-hidden" style={{ borderRadius: '4px' }}>
            <button onClick={() => navigate('/settings/data')} className="flex items-center justify-between h-12 px-3 hover:bg-[#2a2a2c] transition-colors">
              <span className="text-[17px] font-normal text-white">Units</span>
              <div className="flex items-center gap-1 text-[#A1A1A6]">
                <span className="text-[15px]">{settings.strengthUnit} / {settings.cardioUnit}</span>
                <ChevronRight size={18} strokeWidth={1.5} />
              </div>
            </button>
            <hr className="border-t border-[#2C2C2E]" />
            <button onClick={() => navigate('/settings/format')} className="flex items-center justify-between h-12 px-3 hover:bg-[#2a2a2c] transition-colors">
              <span className="text-[17px] font-normal text-white">Date & Time Format</span>
              <div className="flex items-center gap-1 text-[#A1A1A6]">
                <span className="text-[13px] truncate max-w-[140px]">{settings.longDateFormat}</span>
                <ChevronRight size={18} strokeWidth={1.5} />
              </div>
            </button>
            <hr className="border-t border-[#2C2C2E]" />
            <button onClick={() => navigate('/body-measurements')} className="flex items-center justify-between h-12 px-3 hover:bg-[#2a2a2c] transition-colors">
              <span className="text-[17px] font-normal text-white">Body Measurements</span>
              <ChevronRight size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
            </button>
            <hr className="border-t border-[#2C2C2E]" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] font-normal text-white">Max Sets Default</span>
              <div className="flex items-center gap-3 bg-[#2C2C2E] border border-[#2C2C2E] px-2 py-1" style={{ borderRadius: '2px' }}>
                <button onClick={() => updateSetting('maxSets', Math.max(1, settings.maxSets - 1))} className="text-[#3B82F6]">
                  <Minus size={16} strokeWidth={1.5} />
                </button>
                <span className="text-[15px] font-medium text-white w-4 text-center">{settings.maxSets}</span>
                <button onClick={() => updateSetting('maxSets', settings.maxSets + 1)} className="text-[#3B82F6]">
                  <Plus size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Exercise Library */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Exercise Library</h3>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col overflow-hidden" style={{ borderRadius: '4px' }}>
            <button onClick={handleRestoreExercises} className="flex items-center justify-between h-12 px-3 hover:bg-[#2a2a2c] transition-colors">
              <span className="text-[17px] font-normal text-white">Restore Default Exercises</span>
              <ChevronRight size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
            </button>
          </div>
          {restoreMessage && (
            <p className="text-[13px] text-[#3B82F6] px-2">{restoreMessage}</p>
          )}
        </section>

        {/* Plans */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Plans</h3>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col overflow-hidden" style={{ borderRadius: '4px' }}>
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] font-normal text-white">Show Reorder Handles</span>
              <Toggle checked={settings.showReorderHandles} onChange={v => updateSetting('showReorderHandles', v)} />
            </div>
            <hr className="border-t border-[#2C2C2E]" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] font-normal text-white">Show Plan Counts</span>
              <Toggle checked={settings.showPlanCounts} onChange={v => updateSetting('showPlanCounts', v)} />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Tabs</h3>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col overflow-hidden" style={{ borderRadius: '4px' }}>
            <button onClick={() => navigate('/settings/tabs')} className="flex items-center justify-between py-3 px-3 hover:bg-[#2a2a2c] transition-colors min-h-[48px]">
              <span className="text-[17px] font-normal text-white shrink-0 mr-4">Hidden Tabs</span>
              <div className="flex items-center justify-end gap-2 flex-wrap">
                {settings.hiddenTabs.split(',').filter(Boolean).map(t => (
                  <span key={t} className="bg-[#2C2C2E] text-[#A1A1A6] text-[11px] uppercase font-medium px-2 py-1" style={{ borderRadius: '2px' }}>{t}</span>
                ))}
                <ChevronRight size={18} strokeWidth={1.5} className="text-[#A1A1A6] ml-1" />
              </div>
            </button>
          </div>
        </section>

        {/* Workout */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Workout</h3>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col overflow-hidden" style={{ borderRadius: '4px' }}>
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] font-normal text-white">Rest Timers</span>
              <Toggle checked={settings.restTimers} onChange={v => updateSetting('restTimers', v)} />
            </div>
            <hr className="border-t border-[#2C2C2E]" />
            <div className="flex items-center justify-between h-12 px-3">
              <span className="text-[17px] font-normal text-white">Vibrate on Alarm</span>
              <Toggle checked={settings.vibrate} onChange={v => updateSetting('vibrate', v)} />
            </div>
            <hr className="border-t border-[#2C2C2E]" />
            <button onClick={() => navigate('/settings/timer')} className="flex items-center justify-between h-12 px-3 hover:bg-[#2a2a2c] transition-colors">
              <span className="text-[17px] font-normal text-white">Timer Settings</span>
              <ChevronRight size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
            </button>
          </div>
        </section>

        {/* About */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">About</h3>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] flex flex-col overflow-hidden" style={{ borderRadius: '4px' }}>
            <button onClick={openWhatsNew} className="flex items-center justify-between h-12 px-3 hover:bg-[#2a2a2c] transition-colors">
              <span className="text-[17px] font-normal text-white">What's New</span>
              <ChevronRight size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
            </button>
            <hr className="border-t border-[#2C2C2E]" />
            <button onClick={() => navigate('/about')} className="flex items-center justify-between h-12 px-3 hover:bg-[#2a2a2c] transition-colors">
              <span className="text-[17px] font-normal text-white">About KASRAT</span>
              <span className="text-[15px] text-[#A1A1A6]">1.1.16</span>
            </button>
          </div>
        </section>
      </main>

      {whatsNewDialogOpen && <WhatsNewDialog onClose={closeWhatsNew} />}
    </div>
  )
}

