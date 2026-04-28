import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, X } from 'lucide-react'
import Toggle from '../../components/Toggle'
import { useSettingsStore } from '../../store/settingsStore'

export default function DataSettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()
  const [newSupp, setNewSupp] = useState('')

  const supplements: string[] = JSON.parse(settings.supplementsList ?? '[]')

  function addSupplement() {
    const trimmed = newSupp.trim()
    if (!trimmed || supplements.includes(trimmed)) return
    updateSetting('supplementsList', JSON.stringify([...supplements, trimmed]))
    setNewSupp('')
  }

  function removeSupplement(name: string) {
    updateSetting('supplementsList', JSON.stringify(supplements.filter(s => s !== name)))
  }

  return (
    <div className="min-h-screen bg-[#151515] pb-8">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-3 h-16 bg-[#151515] border-b border-zinc-800">
        <button onClick={() => navigate(-1)} className="text-zinc-500 hover:opacity-80 p-2 -ml-2">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="font-semibold text-xl text-[#93032E] tracking-tighter absolute left-1/2 -translate-x-1/2">Data & Format</h1>
        <div className="w-6" />
      </header>

      <main className="flex-1 mt-16 px-3 py-3 space-y-8">
        <section className="bg-[#1C1C1E] rounded-[4px]">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-[#93032E]">Units</h2>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px] border-b border-[#2C2C2E]">
            <span className="text-[17px] text-white">Default Strength Unit</span>
            <div className="flex gap-2">
              {['kg', 'lbs'].map(u => (
                <button
                  key={u}
                  onClick={() => updateSetting('strengthUnit', u)}
                  className={`px-3 py-1 rounded-[2px] text-[13px] font-semibold transition-colors ${settings.strengthUnit === u ? 'bg-[#93032E] text-white' : 'bg-[#2C2C2E] text-[#A1A1A6]'}`}
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
                  className={`px-3 py-1 rounded-[2px] text-[13px] font-semibold transition-colors ${settings.cardioUnit === u ? 'bg-[#93032E] text-white' : 'bg-[#2C2C2E] text-[#A1A1A6]'}`}
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
            <h2 className="font-semibold text-[15px] text-[#93032E]">Tracking</h2>
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
            <h2 className="font-semibold text-[15px] text-[#93032E]">Nutrition Goals</h2>
          </div>
          {([
            ['Daily Calories', 'nutritionCaloriesGoal', 'numeric', 'kcal'],
            ['Protein', 'nutritionProteinGoal', 'numeric', 'g'],
            ['Carbs', 'nutritionCarbsGoal', 'numeric', 'g'],
            ['Fats', 'nutritionFatsGoal', 'numeric', 'g'],
            ['Water', 'nutritionWaterGoal', 'decimal', 'L'],
          ] as const).map(([label, key, mode, unit], i, arr) => (
            <div key={key} className={`flex items-center justify-between px-3 py-3 ${i < arr.length - 1 ? 'border-b border-[#2C2C2E]' : ''}`}>
              <span className="text-[17px] text-white">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode={mode}
                  value={settings[key] ?? 0}
                  onChange={e => updateSetting(key, Number(e.target.value))}
                  className="w-20 bg-[#2C2C2E] border border-[#2C2C2E] rounded-[2px] px-2 py-1.5 text-[15px] text-white text-center focus:outline-none focus:border-[#93032E]"
                />
                <span className="text-[13px] text-[#A1A1A6] w-6">{unit}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-[#1C1C1E] rounded-[4px]">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-[#93032E]">Supplements</h2>
          </div>
          {/* Add new supplement */}
          <div className="flex items-center gap-2 px-3 pb-3 border-b border-[#2C2C2E]">
            <input
              value={newSupp}
              onChange={e => setNewSupp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSupplement()}
              placeholder="e.g. Creatine"
              className="flex-1 bg-[#2C2C2E] border border-[#2C2C2E] rounded-[2px] px-3 py-2 text-[15px] text-white placeholder-[#A1A1A6] focus:outline-none focus:border-[#93032E]"
            />
            <button
              onClick={addSupplement}
              className="h-9 px-3 bg-[#93032E] text-white font-medium text-[13px] rounded-[2px] shrink-0"
            >
              Add
            </button>
          </div>
          {supplements.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-[#A1A1A6]">No supplements added yet.</p>
          ) : (
            supplements.map((s, i) => (
              <div key={s} className={`flex items-center justify-between px-3 min-h-[48px] ${i < supplements.length - 1 ? 'border-b border-[#2C2C2E]' : ''}`}>
                <span className="text-[17px] text-white">{s}</span>
                <button onClick={() => removeSupplement(s)} className="p-1 text-[#A1A1A6] hover:text-[#FF453A]">
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  )
}
