import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { db } from '../db/database'

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Other',
] as const

export type MuscleGroup = typeof MUSCLE_GROUPS[number]

const EXERCISE_TYPES = ['Strength', 'Cardio'] as const

// ─── Reusable muscle-group selector ──────────────────────────────────────────
interface MuscleSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  error?: string
  includeNone?: boolean
}

export function MuscleSelect({ label, value, onChange, required, error, includeNone }: MuscleSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium text-[#c2c6d6]">
        {label}{required && <span className="text-[#ffb4ab] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[#1b1b1d] border border-[#424754] rounded-lg p-3 text-[17px] text-white appearance-none focus:border-[#4d8eff] focus:outline-none"
        >
          {includeNone && <option value="">— None —</option>}
          {MUSCLE_GROUPS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c2c6d6] pointer-events-none">▾</span>
      </div>
      {error && <p className="text-[#ffb4ab] text-[13px]">{error}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AddExercisePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState<'strength' | 'cardio'>('strength')
  const [primaryMuscle, setPrimaryMuscle] = useState<string>('Chest')
  const [secondaryMuscle, setSecondaryMuscle] = useState<string>('')
  const [cues, setCues] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [nameError, setNameError] = useState('')

  async function save() {
    if (!name.trim()) { setNameError('Exercise name is required'); return }
    await db.gym_sets.add({
      name: name.trim(),
      reps: 0,
      weight: 0,
      unit: type === 'cardio' ? 'km' : 'kg',
      created: new Date().toISOString(),
      hidden: true,
      bodyWeight: false,
      duration: 0,
      distance: 0,
      cardio: type === 'cardio',
      restMs: 0,
      notes: primaryMuscle,
      primaryMuscle,
      secondaryMuscle: secondaryMuscle || undefined,
    })
    // F5 – persist cues to exercise_meta
    if (cues.trim()) {
      await db.exercise_meta.put({ name: name.trim(), cues: cues.trim() })
    }
    navigate(-1)
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 h-14 shrink-0 bg-black/80 backdrop-blur-md z-20">
        <button onClick={() => navigate(-1)} className="text-white p-2 -ml-2 hover:opacity-80">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">New Exercise</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-[200px]">
        <div className="bg-[#1b1b1d] rounded-lg p-3 flex flex-col gap-4">

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#c2c6d6]">
              Exercise Name<span className="text-[#ffb4ab] ml-0.5">*</span>
            </label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setNameError('') }}
              className="w-full bg-[#1b1b1d] border border-[#424754] rounded-lg p-3 text-[17px] text-white placeholder-[#8c909f] focus:border-[#4d8eff] focus:outline-none"
              placeholder="e.g., Barbell Bench Press"
            />
            {nameError && <p className="text-[#ffb4ab] text-[13px]">{nameError}</p>}
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#c2c6d6]">Type</label>
            <div className="flex gap-3">
              {EXERCISE_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t.toLowerCase() as 'strength' | 'cardio')}
                  className={`flex-1 h-12 rounded-xl font-semibold text-[15px] transition-all ${
                    type === t.toLowerCase()
                      ? 'bg-[#4d8eff] text-[#00285d]'
                      : 'border border-[#424754] text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Primary muscle */}
          <MuscleSelect label="Primary Muscle Group" value={primaryMuscle} onChange={setPrimaryMuscle} required />

          {/* Secondary muscle */}
          <MuscleSelect label="Secondary Muscle Group" value={secondaryMuscle} onChange={setSecondaryMuscle} includeNone />

          {/* F5 – Advanced / Coach's Cues (collapsible) */}
          <div className="flex flex-col gap-0">
            <button
              onClick={() => setAdvancedOpen(o => !o)}
              className="flex items-center justify-between py-2 text-[13px] font-medium text-[#c2c6d6] hover:text-white transition-colors"
            >
              <span>Advanced</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-200"
              style={{ maxHeight: advancedOpen ? '200px' : '0px' }}
            >
              <div className="flex flex-col gap-2 pt-1 pb-2">
                <label className="text-[13px] font-medium text-[#c2c6d6]">Coach's Cues</label>
                <textarea
                  value={cues}
                  onChange={e => setCues(e.target.value)}
                  rows={3}
                  placeholder="e.g., Keep elbows tucked, drive through heels…"
                  className="w-full bg-[#131315] border border-[#424754] rounded-lg p-3 text-[15px] text-white placeholder-[#8c909f] focus:border-[#4d8eff] focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 w-full flex flex-col z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="bg-black/95 backdrop-blur-md px-4 py-3 border-t border-[#2a2a2c]">
          <button onClick={save} className="w-full h-12 bg-[#4d8eff] text-[#00285d] rounded-xl font-semibold text-[15px]">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
