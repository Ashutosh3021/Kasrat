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
    <div className="min-h-screen bg-ground pb-8">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-3 h-16 bg-ground border-b border-zinc-800">
        <button onClick={() => navigate(-1)} className="text-zinc-500 hover:opacity-80 p-2 -ml-2">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="font-semibold text-xl text-accent-soft tracking-tighter absolute left-1/2 -translate-x-1/2">Data & Format</h1>
        <div className="w-6" />
      </header>

      <main className="flex-1 mt-16 px-3 py-3 space-y-8">
        <section className="bg-surface rounded-2xl">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-accent-soft">Units</h2>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px] border-b border-line">
            <span className="text-[16px] text-ink">Default Strength Unit</span>
            <div className="flex gap-2">
              {['kg', 'lbs'].map(u => (
                <button
                  key={u}
                  onClick={() => updateSetting('strengthUnit', u)}
                  className={`px-3 py-1 rounded-lg text-[13px] font-semibold transition-colors ${settings.strengthUnit === u ? 'bg-accent text-ink' : 'bg-line text-muted'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px] border-b border-line">
            <span className="text-[16px] text-ink">Default Cardio Unit</span>
            <div className="flex gap-2">
              {['km', 'mi'].map(u => (
                <button
                  key={u}
                  onClick={() => updateSetting('cardioUnit', u)}
                  className={`px-3 py-1 rounded-lg text-[13px] font-semibold transition-colors ${settings.cardioUnit === u ? 'bg-accent text-ink' : 'bg-line text-muted'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px]">
            <span className="text-[16px] text-ink">Show Units on Graphs</span>
            <Toggle checked={settings.showUnits} onChange={v => updateSetting('showUnits', v)} />
          </div>
        </section>

        <section className="bg-surface rounded-2xl">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-accent-soft">Tracking</h2>
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px] border-b border-line">
            <span className="text-[16px] text-ink">Group History by Day</span>
            <Toggle checked={settings.groupHistory} onChange={v => updateSetting('groupHistory', v)} />
          </div>
          <div className="flex flex-col justify-center px-3 py-3 border-b border-line min-h-[64px]">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-[16px] text-ink">Max Sets Default</span>
                <span className="text-[13px] font-medium text-muted mt-1">Default maximum sets per exercise</span>
              </div>
              <div className="flex items-center space-x-3 bg-line rounded-lg px-3 py-1">
                <button onClick={() => updateSetting('maxSets', Math.max(1, settings.maxSets - 1))} className="text-muted hover:text-ink">
                  <Minus size={16} strokeWidth={1.5} />
                </button>
                <span className="text-[16px] text-ink font-medium w-4 text-center">{settings.maxSets}</span>
                <button onClick={() => updateSetting('maxSets', settings.maxSets + 1)} className="text-muted hover:text-ink">
                  <Plus size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-3 border-b border-line min-h-[64px]">
            <div className="flex flex-col pr-4">
              <span className="text-[16px] text-ink">Rep Estimation</span>
              <span className="text-[13px] font-medium text-muted mt-1">Estimate reps based on previous sets</span>
            </div>
            <Toggle checked={settings.repEstimation} onChange={v => updateSetting('repEstimation', v)} />
          </div>
          <div className="flex items-center justify-between px-3 min-h-[48px]">
            <span className="text-[16px] text-ink">Duration Estimation</span>
            <Toggle checked={settings.durationEstimation} onChange={v => updateSetting('durationEstimation', v)} />
          </div>
        </section>

        <section className="bg-surface rounded-2xl">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-accent-soft">Nutrition Goals</h2>
          </div>
          {([
            ['Daily Calories', 'nutritionCaloriesGoal', 'numeric', 'kcal'],
            ['Protein', 'nutritionProteinGoal', 'numeric', 'g'],
            ['Carbs', 'nutritionCarbsGoal', 'numeric', 'g'],
            ['Fats', 'nutritionFatsGoal', 'numeric', 'g'],
            ['Water', 'nutritionWaterGoal', 'decimal', 'L'],
          ] as const).map(([label, key, mode, unit], i, arr) => (
            <div key={key} className={`flex items-center justify-between px-3 py-3 ${i < arr.length - 1 ? 'border-b border-line' : ''}`}>
              <span className="text-[16px] text-ink">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode={mode}
                  value={settings[key] ?? 0}
                  onChange={e => updateSetting(key, Number(e.target.value))}
                  className="w-20 bg-line border border-line rounded-lg px-2 py-1.5 text-[15px] text-ink text-center focus:outline-none focus:border-accent-hover"
                />
                <span className="text-[13px] text-muted w-6">{unit}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-surface rounded-2xl">
          <div className="px-3 pt-3 pb-2">
            <h2 className="font-semibold text-[15px] text-accent-soft">Supplements</h2>
          </div>
          {/* Add new supplement */}
          <div className="flex items-center gap-2 px-3 pb-3 border-b border-line">
            <input
              value={newSupp}
              onChange={e => setNewSupp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSupplement()}
              placeholder="e.g. Creatine"
              className="flex-1 bg-line border border-line rounded-lg px-3 py-2 text-[15px] text-ink placeholder-muted focus:outline-none focus:border-accent-hover"
            />
            <button
              onClick={addSupplement}
              className="h-9 px-3 bg-accent text-ink font-medium text-[13px] rounded-lg shrink-0"
            >
              Add
            </button>
          </div>
          {supplements.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-muted">No supplements added yet.</p>
          ) : (
            supplements.map((s, i) => (
              <div key={s} className={`flex items-center justify-between px-3 min-h-[48px] ${i < supplements.length - 1 ? 'border-b border-line' : ''}`}>
                <span className="text-[16px] text-ink">{s}</span>
                <button onClick={() => removeSupplement(s)} className="p-1 text-muted hover:text-danger">
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
