import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { db, type GymSet } from '../db/database'
import Toggle from '../components/Toggle'
import { useSettingsStore } from '../store/settingsStore'
import { deleteGymSet, updateGymSet } from '../supabase/writeSync'

// ─── Brzycki 1RM formula ──────────────────────────────────────────────────────
function brzycki(weight: number, reps: number): number | null {
  if (weight <= 0 || reps <= 0 || reps >= 37) return null
  return Math.round(weight * (36 / (37 - reps)))
}

// ─── Tiny numeric input used for RPE / RIR ────────────────────────────────────
interface TinyInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
  placeholder?: string
}
function TinyInput({ label, value, onChange, min, max, placeholder }: TinyInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col items-center gap-1">
      {!focused && (
        <span className="text-[11px] font-medium text-[#A1A1A6] leading-none">{label}</span>
      )}
      {focused && <span className="text-[11px] font-medium text-[#A1A1A6] leading-none opacity-0 select-none">{label}</span>}
      <input
        type="number"
        inputMode="numeric"
        value={value}
        placeholder={focused ? placeholder ?? label : '—'}
        min={min}
        max={max}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => onChange(e.target.value)}
        className="w-12 h-10 bg-[#1C1C1E] border border-[#2C2C2E] text-[15px] text-white text-center focus:outline-none focus:border-[#93032E] tabular-nums"
        style={{ borderRadius: '2px' }}
      />
    </div>
  )
}

export default function EditSetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const [set, setSet] = useState<GymSet | null>(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')
  const [rir, setRir] = useState('')
  const [notes, setNotes] = useState('')
  const [warmup, setWarmup] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)  // EDGE-001: dirty flag

  useEffect(() => {
    if (!id) return
    db.gym_sets.get(Number(id)).then(s => {
      if (!s) return
      setSet(s)
      setWeight(String(s.weight))
      setReps(String(s.reps))
      setRpe(s.rpe != null ? String(s.rpe) : '')
      setRir(s.rir != null ? String(s.rir) : '')
      setNotes(s.notes ?? '')
      setWarmup(s.hidden)
    })
  }, [id])

  // EDGE-001: intercept back navigation when there are unsaved changes
  function handleBack() {
    if (hasChanges) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    navigate(-1)
  }

  async function save() {
    if (!set?.id) return
    await updateGymSet(set.id, {
      weight: parseFloat(weight),
      reps: parseInt(reps),
      rpe: rpe !== '' ? parseFloat(rpe) : undefined,
      rir: rir !== '' ? parseFloat(rir) : undefined,
      notes,
      hidden: warmup,
    })
    setHasChanges(false)
    navigate(-1)
  }

  async function deleteSet() {
    if (!set?.id) return
    await deleteGymSet(set.id)
    navigate(-1)
  }

  const w = parseFloat(weight)
  const r = parseInt(reps)
  const orm = !set?.cardio ? brzycki(w, r) : null

  return (
    <div className="min-h-screen bg-[#151515] pb-safe">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-3 h-14 bg-[#151515] border-b border-[#2C2C2E]">
        <button onClick={handleBack} className="text-white flex items-center justify-center p-2 hover:bg-[#1C1C1E]" style={{ borderRadius: '2px' }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-medium text-white">Edit Set</h1>
        <button onClick={deleteSet} className="text-[#FF453A] flex items-center justify-center p-2 hover:bg-[#1C1C1E]" style={{ borderRadius: '2px' }}>
          <Trash2 size={20} strokeWidth={1.5} />
        </button>
      </header>

      <main className="pt-16 px-3 pb-24">
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col gap-4" style={{ borderRadius: '4px' }}>

          {/* Exercise name */}
          <div>
            <label className="text-[13px] font-medium text-[#A1A1A6] block mb-1">Exercise</label>
            <div className="text-[17px] text-white py-2">{set?.name}</div>
          </div>
          <div className="h-px bg-[#2C2C2E] w-full" />

          {/* Weight + Reps */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] font-medium text-[#A1A1A6] block mb-1">Weight ({settings.strengthUnit})</label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={e => { setWeight(e.target.value); setHasChanges(true) }}
                className="w-full bg-[#1C1C1E] border border-[#2C2C2E] text-[17px] text-white px-3 py-3 focus:outline-none focus:border-[#93032E]"
                style={{ borderRadius: '2px' }}
              />
            </div>
            <div className="flex-1">
              <label className="text-[13px] font-medium text-[#A1A1A6] block mb-1">Reps</label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={e => { setReps(e.target.value); setHasChanges(true) }}
                className="w-full bg-[#1C1C1E] border border-[#2C2C2E] text-[17px] text-white px-3 py-3 focus:outline-none focus:border-[#93032E]"
                style={{ borderRadius: '2px' }}
              />
            </div>
          </div>

          {/* RPE / RIR row */}
          {!set?.cardio && (
            <div className="flex items-end gap-4">
              <TinyInput label="RPE" value={rpe} onChange={v => { setRpe(v); setHasChanges(true) }} min={1} max={10} placeholder="1-10" />
              <TinyInput label="RIR" value={rir} onChange={v => { setRir(v); setHasChanges(true) }} min={0} max={5} placeholder="0-5" />
              {/* live 1RM chip */}
              <div className="flex-1 flex justify-end items-end pb-0.5">
                <span
                  className={`text-[12px] font-medium px-2 py-0.5 transition-opacity duration-200 ${
                    orm != null
                      ? 'bg-[#1C1C1E] text-[#93032E] border border-[#93032E]/30 opacity-100'
                      : 'opacity-0'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  ≈ 1RM: {orm ?? '—'} {settings.strengthUnit}
                </span>
              </div>
            </div>
          )}

          <div className="h-px bg-[#2C2C2E] w-full" />

          {/* Warmup toggle */}
          <div className="flex justify-between items-center py-2">
            <div>
              <div className="text-[17px] text-white">Warmup Set</div>
              <div className="text-[13px] font-medium text-[#A1A1A6]">Does not count towards volume</div>
            </div>
            <Toggle checked={warmup} onChange={v => { setWarmup(v); setHasChanges(true) }} />
          </div>

          <div className="h-px bg-[#2C2C2E] w-full" />

          {/* Notes */}
          <div>
            <label className="text-[13px] font-medium text-[#A1A1A6] block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setHasChanges(true) }}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] text-[17px] text-white px-3 py-3 focus:outline-none focus:border-[#93032E] resize-none"
              style={{ borderRadius: '2px' }}
              rows={3}
              placeholder="Add notes..."
            />
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full p-3 bg-[#151515]/90 backdrop-blur-md border-t border-[#2C2C2E] z-40 pb-safe">
        <button onClick={save} className="w-full bg-[#93032E] text-white font-medium text-[15px] h-12 flex items-center justify-center" style={{ borderRadius: '2px' }}>
          Save Changes
        </button>
      </div>
    </div>
  )
}
