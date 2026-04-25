import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import Toggle from '../../components/Toggle'
import { useSettingsStore } from '../../store/settingsStore'

export default function DataSettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-3 h-16 bg-black border-b border-zinc-800">
        <button onClick={() => navigate(-1)} className="text-zinc-500 hover:opacity-80 p-2 -ml-2">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="font-semibold text-xl text-[#3B82F6] tracking-tighter absolute left-1/2 -translate-x-1/2">Data & Format</h1>
        <div className="w-6" />
      </header>

      <main className="flex-1 mt-16 px-3 py-3 space-y-8">
        <section className="bg-[#1C1C1E] rounded-[4px]">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-[#3B82F6]">Units</h2>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px] border-b border-[#2C2C2E]">
            <span className="text-[17px] text-white">Default Strength Unit</span>
            <div className="flex gap-2">
              {['kg', 'lbs'].map(u => (
                <button
                  key={u}
                  onClick={() => updateSetting('strengthUnit', u)}
                  className={`px-3 py-1 rounded-[2px] text-[13px] font-semibold transition-colors ${settings.strengthUnit === u ? 'bg-[#3B82F6] text-white' : 'bg-[#2C2C2E] text-[#A1A1A6]'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px] border-b border-[#2C2C2E]">
            <span className="text-[17px] text-white">Default Cardio Unit</span>
            <div className="flex gap-2">
              {['km', 'mi'].map(u => (
                <button
                  key={u}
                  onClick={() => updateSetting('cardioUnit', u)}
                  className={`px-3 py-1 rounded-[2px] text-[13px] font-semibold transition-colors ${settings.cardioUnit === u ? 'bg-[#3B82F6] text-white' : 'bg-[#2C2C2E] text-[#A1A1A6]'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px]">
            <span className="text-[17px] text-white">Show Units on Graphs</span>
            <Toggle checked={settings.showUnits} onChange={v => updateSetting('showUnits', v)} />
          </div>
        </section>

        <section className="bg-[#1C1C1E] rounded-[4px]">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-[#3B82F6]">Tracking</h2>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px] border-b border-[#2C2C2E]">
            <span className="text-[17px] text-white">Group History by Day</span>
            <Toggle checked={settings.groupHistory} onChange={v => updateSetting('groupHistory', v)} />
          </div>
          <div className="flex flex-col justify-center px-3 py-3 border-b border-[#2C2C2E] min-h-[64px]">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-[17px] text-white">Max Sets Default</span>
                <span className="text-[13px] font-medium text-[#A1A1A6] mt-1">Default maximum sets per exercise</span>
              </div>
              <div className="flex items-center space-x-3 bg-[#2C2C2E] rounded-[2px] px-3 py-1">
                <button onClick={() => updateSetting('maxSets', Math.max(1, settings.maxSets - 1))} className="text-[#A1A1A6] hover:text-white">
                  <Minus size={16} strokeWidth={1.5} />
                </button>
                <span className="text-[17px] text-white font-medium w-4 text-center">{settings.maxSets}</span>
                <button onClick={() => updateSetting('maxSets', settings.maxSets + 1)} className="text-[#A1A1A6] hover:text-white">
                  <Plus size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-3 border-b border-[#2C2C2E] min-h-[64px]">
            <div className="flex flex-col pr-4">
              <span className="text-[17px] text-white">Rep Estimation</span>
              <span className="text-[13px] font-medium text-[#A1A1A6] mt-1">Estimate reps based on previous sets</span>
            </div>
            <Toggle checked={settings.repEstimation} onChange={v => updateSetting('repEstimation', v)} />
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px]">
            <span className="text-[17px] text-white">Duration Estimation</span>
            <Toggle checked={settings.durationEstimation} onChange={v => updateSetting('durationEstimation', v)} />
          </div>
        </section>

        <section className="bg-[#1C1C1E] rounded-[4px]">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-[#3B82F6]">Nutrition Goals</h2>
          </div>
          <div className="flex flex-col justify-center px-3 py-3 border-b border-[#2C2C2E] min-h-[56px]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] text-white">Daily Calories</span>
              <input
                type="number"
                inputMode="numeric"
                value={settings.nutritionCaloriesGoal ?? 0}
                onChange={e => updateSetting('nutritionCaloriesGoal', Number(e.target.value))}
                className="w-20 bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-2 py-1.5 text-[15px] text-white text-center focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
          <div className="flex flex-col justify-center px-3 py-3 border-b border-[#2C2C2E] min-h-[56px]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] text-white">Daily Protein (g)</span>
              <input
                type="number"
                inputMode="numeric"
                value={settings.nutritionProteinGoal ?? 0}
                onChange={e => updateSetting('nutritionProteinGoal', Number(e.target.value))}
                className="w-20 bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-2 py-1.5 text-[15px] text-white text-center focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
          <div className="flex flex-col justify-center px-3 py-3 min-h-[56px]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] text-white">Daily Water (L)</span>
              <input
                type="number"
                inputMode="decimal"
                value={settings.nutritionWaterGoal ?? 0}
                onChange={e => updateSetting('nutritionWaterGoal', Number(e.target.value))}
                className="w-20 bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-2 py-1.5 text-[15px] text-white text-center focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
