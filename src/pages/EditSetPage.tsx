import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { db, type GymSet } from '../db/database'
import Toggle from '../components/Toggle'
import { useSettingsStore } from '../store/settingsStore'

export default function EditSetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const [set, setSet] = useState<GymSet | null>(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [notes, setNotes] = useState('')
  const [warmup, setWarmup] = useState(false)

  useEffect(() => {
    if (!id) return
    db.gym_sets.get(Number(id)).then(s => {
      if (!s) return
      setSet(s)
      setWeight(String(s.weight))
      setReps(String(s.reps))
      setNotes(s.notes ?? '')
      setWarmup(s.hidden)
    })
  }, [id])

  async function save() {
    if (!set?.id) return
    await db.gym_sets.update(set.id, {
      weight: parseFloat(weight),
      reps: parseInt(reps),
      notes,
      hidden: warmup
    })
    navigate(-1)
  }

  async function deleteSet() {
    if (!set?.id) return
    await db.gym_sets.delete(set.id)
    navigate(-1)
  }

  const orm = set ? Math.round(parseFloat(weight) * (1 + parseInt(reps) / 30)) : 0

  return (
    <div className="min-h-screen bg-black pb-safe">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 h-14 bg-black border-b border-[#2C2C2E]">
        <button onClick={() => navigate(-1)} className="text-white flex items-center justify-center p-2 rounded-full hover:bg-[#1C1C1E]">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[22px] font-semibold text-white">Edit Set</h1>
        <button onClick={deleteSet} className="text-[#ffb4ab] flex items-center justify-center p-2 rounded-full hover:bg-[#1C1C1E]">
          <Trash2 size={22} />
        </button>
      </header>

      <main className="pt-16 px-4 pb-24">
        <div className="bg-[#1C1C1E] rounded-xl p-3 flex flex-col gap-4">
          <div>
            <label className="text-[13px] font-medium text-[#c2c6d6] block mb-1">Exercise</label>
            <div className="text-[17px] text-white py-2">{set?.name}</div>
          </div>
          <div className="h-px bg-[#2C2C2E] w-full" />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] font-medium text-[#c2c6d6] block mb-1">Weight ({settings.strengthUnit})</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg text-[17px] text-white px-3 py-3 focus:outline-none focus:border-[#4d8eff]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[13px] font-medium text-[#c2c6d6] block mb-1">Reps</label>
              <input
                type="number"
                value={reps}
                onChange={e => setReps(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg text-[17px] text-white px-3 py-3 focus:outline-none focus:border-[#4d8eff]"
              />
            </div>
          </div>

          {!isNaN(orm) && orm > 0 && (
            <div className="text-[13px] font-medium text-[#4d8eff] flex items-center gap-1">
              ⚡ Estimated 1RM: {orm} {settings.strengthUnit}
            </div>
          )}

          <div className="h-px bg-[#2C2C2E] w-full" />

          <div className="flex justify-between items-center py-2">
            <div>
              <div className="text-[17px] text-white">Warmup Set</div>
              <div className="text-[13px] font-medium text-[#c2c6d6]">Does not count towards volume</div>
            </div>
            <Toggle checked={warmup} onChange={setWarmup} />
          </div>

          <div className="h-px bg-[#2C2C2E] w-full" />

          <div>
            <label className="text-[13px] font-medium text-[#c2c6d6] block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg text-[17px] text-white px-3 py-3 focus:outline-none focus:border-[#4d8eff] resize-none"
              rows={3}
              placeholder="Add notes..."
            />
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full p-4 bg-black/90 backdrop-blur-md border-t border-[#2C2C2E] z-40 pb-safe">
        <button onClick={save} className="w-full bg-[#3B82F6] text-white font-semibold text-[15px] h-12 rounded-xl flex items-center justify-center">
          Save Changes
        </button>
      </div>
    </div>
  )
}
