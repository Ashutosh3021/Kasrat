import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Toggle from '../../components/Toggle'
import { useSettingsStore } from '../../store/settingsStore'

export default function AppearanceSettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="flex items-center px-3 py-3 h-16 sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#2C2C2E]">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white hover:text-[#3B82F6]">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="ml-2 text-[22px] font-semibold text-white">Appearance</h1>
      </header>

      <main className="flex-1 px-3 flex flex-col gap-8 pb-12 overflow-y-auto pt-4">
        <section className="flex flex-col gap-4">
          <h2 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Theme</h2>
          <div className="bg-[#1C1C1E] rounded-[4px] p-3 border border-[#2C2C2E]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[17px] text-white">Theme Mode</span>
            </div>
            <div className="flex bg-[#131315] p-1 rounded-[2px] border border-[#2C2C2E]">
              {['Light', 'Dark', 'Pure Black'].map(t => (
                <button
                  key={t}
                  onClick={() => updateSetting('themeMode', t.toLowerCase().replace(' ', '_'))}
                  className={`flex-1 py-2 text-center font-semibold text-[15px] rounded-[2px] transition-colors ${
                    settings.themeMode === t.toLowerCase().replace(' ', '_')
                      ? 'bg-[#3B82F6] text-white'
                      : 'text-[#A1A1A6] hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Data Visualization</h2>
          <div className="bg-[#1C1C1E] rounded-[4px] p-3 border border-[#2C2C2E] flex flex-col gap-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-[17px] text-white">System Colors</span>
              <Toggle checked={settings.systemColors} onChange={v => updateSetting('systemColors', v)} />
            </div>
            <hr className="border-[#2C2C2E] -mx-3" />
            <div className="flex justify-between items-center py-2">
              <span className="text-[17px] text-white">Curve Lines</span>
              <Toggle checked={settings.curveLines} onChange={v => updateSetting('curveLines', v)} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest px-2">Display Elements</h2>
          <div className="bg-[#1C1C1E] rounded-[4px] p-3 border border-[#2C2C2E] flex flex-col gap-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-[17px] text-white">Hide Body Weight</span>
              <Toggle checked={settings.hideWeight} onChange={v => updateSetting('hideWeight', v)} />
            </div>
            <hr className="border-[#2C2C2E] -mx-3" />
            <div className="flex justify-between items-center py-2">
              <span className="text-[17px] text-white">Hide Categories</span>
              <Toggle checked={settings.hideCategories} onChange={v => updateSetting('hideCategories', v)} />
            </div>
            <hr className="border-[#2C2C2E] -mx-3" />
            <div className="flex justify-between items-center py-2">
              <span className="text-[17px] text-white">Hide Global Progress</span>
              <Toggle checked={settings.hideGlobalProgress} onChange={v => updateSetting('hideGlobalProgress', v)} />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
