import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { db, type ExercisePreset } from '../db/database'
import { MUSCLE_GROUPS, type MuscleGroup } from '../data/exercisePresets'
import { supabase } from '../supabase/client'

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
      <label className="text-[13px] font-medium text-[#A1A1A6]">
        {label}{required && <span className="text-[#FF453A] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[#1C1C1E] border border-[#2C2C2E] p-3 text-[17px] text-white appearance-none focus:border-[#93032E] focus:outline-none"
          style={{ borderRadius: '2px' }}
        >
          {includeNone && <option value="">— None —</option>}
          {MUSCLE_GROUPS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1A6] pointer-events-none" strokeWidth={1.5} />
      </div>
      {error && <p className="text-[#FF453A] text-[13px]">{error}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AddExercisePage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'presets' | 'custom'>('presets')
  const [presets, setPresets] = useState<ExercisePreset[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<MuscleGroup>>(new Set(MUSCLE_GROUPS))
  const [name, setName] = useState('')
  const [type, setType] = useState<'strength' | 'cardio'>('strength')
  const [primaryMuscle, setPrimaryMuscle] = useState<string>('Chest')
  const [secondaryMuscle, setSecondaryMuscle] = useState<string>('')
  const [cues, setCues] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    async function loadPresets() {
      const all = await db.exercise_presets.toArray()
      setPresets(all)
    }
    loadPresets()
  }, [])

  function selectPreset(preset: ExercisePreset) {
    setName(preset.name)
    setPrimaryMuscle(preset.primaryMuscle)
    setSecondaryMuscle(preset.secondaryMuscle || '')
    setType('strength')
    setMode('custom')
  }

  function toggleGroup(group: MuscleGroup) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  async function save() {
    if (!name.trim()) { setNameError('Exercise name is required'); return }

    // Save to exercise_meta locally
    await db.exercise_meta.put({
      name: name.trim(),
      cues: cues.trim() || undefined
    })

    // Create hidden gym_set template locally
    const existing = await db.gym_sets.where('name').equals(name.trim()).first()
    if (!existing) {
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
    }

    // Push custom exercise to Supabase custom_exercises table
    const { data: { user } } = await supabase.auth.getUser()
    if (user && navigator.onLine) {
      await supabase.from('custom_exercises').upsert({
        user_id: user.id,
        name: name.trim(),
        primary_muscle: primaryMuscle,
        secondary_muscle: secondaryMuscle || null,
        equipment: null,
        cues: cues.trim() || null,
      })
    }

    navigate(-1)
  }

  const groupedPresets: Record<MuscleGroup, ExercisePreset[]> = {} as any
  MUSCLE_GROUPS.forEach(g => { groupedPresets[g] = [] })
  presets.forEach(p => {
    const muscle = p.primaryMuscle as MuscleGroup
    if (groupedPresets[muscle]) {
      groupedPresets[muscle].push(p)
    }
  })

  return (
    <div className="h-screen bg-[#151515] flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-3 h-14 shrink-0 bg-[#151515]/80 backdrop-blur-md z-20 border-b border-[#2C2C2E]">
        <button onClick={() => navigate(-1)} className="text-white p-2 -ml-2 hover:opacity-80">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-medium text-white absolute left-1/2 -translate-x-1/2">New Exercise</h1>
        <div className="w-10" />
      </header>

      {/* Mode toggle */}
      <div className="px-3 py-3 flex gap-2 border-b border-[#2C2C2E]">
        <button
          onClick={() => setMode('presets')}
          className={`flex-1 h-10 font-medium text-[15px] transition-colors ${
            mode === 'presets'
              ? 'bg-[#93032E] text-white'
              : 'bg-[#1C1C1E] border border-[#2C2C2E] text-[#A1A1A6]'
          }`}
          style={{ borderRadius: '2px' }}
        >
          Presets
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`flex-1 h-10 font-medium text-[15px] transition-colors ${
            mode === 'custom'
              ? 'bg-[#93032E] text-white'
              : 'bg-[#1C1C1E] border border-[#2C2C2E] text-[#A1A1A6]'
          }`}
          style={{ borderRadius: '2px' }}
        >
          Custom
        </button>
      </div>

      <main className="flex-1 overflow-y-auto px-3 py-3 pb-[200px]">
        {mode === 'presets' ? (
          <div className="space-y-2">
            {MUSCLE_GROUPS.map(group => {
              const exercises = groupedPresets[group]
              if (exercises.length === 0) return null
              const isExpanded = expandedGroups.has(group)

              return (
                <div key={group}>
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between bg-[#1C1C1E] border border-[#2C2C2E] px-3 py-2 hover:bg-[#2a2a2c] transition-colors"
                    style={{ borderRadius: '4px' }}
                  >
                    <span className="text-[15px] font-medium text-white">{group}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#A1A1A6]">{exercises.length}</span>
                      {isExpanded ? (
                        <ChevronDown size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
                      ) : (
                        <ChevronRight size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-2">
                      {exercises.map(ex => (
                        <button
                          key={ex.name}
                          onClick={() => selectPreset(ex)}
                          className="w-full bg-[#1C1C1E] border border-[#2C2C2E] p-2 flex items-center justify-between hover:border-[#93032E] transition-colors text-left"
                          style={{ borderRadius: '4px' }}
                        >
                          <span className="text-[15px] font-normal text-white">{ex.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col gap-4" style={{ borderRadius: '4px' }}>

            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#A1A1A6]">
                Exercise Name<span className="text-[#FF453A] ml-0.5">*</span>
              </label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setNameError('') }}
                className="w-full bg-[#1C1C1E] border border-[#2C2C2E] p-3 text-[17px] text-white placeholder-[#A1A1A6] focus:border-[#93032E] focus:outline-none"
                style={{ borderRadius: '2px' }}
                placeholder="e.g., Barbell Bench Press"
              />
              {nameError && <p className="text-[#FF453A] text-[13px]">{nameError}</p>}
            </div>

            {/* Type */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-[#A1A1A6]">Type</label>
              <div className="flex gap-2">
                {EXERCISE_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t.toLowerCase() as 'strength' | 'cardio')}
                    className={`flex-1 h-10 font-medium text-[15px] transition-all ${
                      type === t.toLowerCase()
                        ? 'bg-[#93032E] text-white'
                        : 'border border-[#2C2C2E] text-white'
                    }`}
                    style={{ borderRadius: '2px' }}
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

            {/* Advanced / Coach's Cues (collapsible) */}
            <div className="flex flex-col gap-0">
              <button
                onClick={() => setAdvancedOpen(o => !o)}
                className="flex items-center justify-between py-2 text-[13px] font-medium text-[#A1A1A6] hover:text-white transition-colors"
              >
                <span>Advanced</span>
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: advancedOpen ? '200px' : '0px' }}
              >
                <div className="flex flex-col gap-2 pt-1 pb-2">
                  <label className="text-[13px] font-medium text-[#A1A1A6]">Coach's Cues</label>
                  <textarea
                    value={cues}
                    onChange={e => setCues(e.target.value)}
                    rows={3}
                    placeholder="e.g., Keep elbows tucked, drive through heels…"
                    className="w-full bg-[#1C1C1E] border border-[#2C2C2E] p-3 text-[15px] text-white placeholder-[#A1A1A6] focus:border-[#93032E] focus:outline-none resize-none"
                    style={{ borderRadius: '2px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {mode === 'custom' && (
        <div className="fixed bottom-0 w-full flex flex-col z-50">
          <div className="bg-[#151515]/95 backdrop-blur-md px-3 py-3 border-t border-[#2C2C2E]">
            <button onClick={save} className="w-full h-12 bg-[#93032E] text-white font-medium text-[15px]" style={{ borderRadius: '2px' }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
