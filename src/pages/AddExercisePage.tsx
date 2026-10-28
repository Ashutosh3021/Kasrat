import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { db, type ExercisePreset } from '../db/database'
import { MUSCLE_GROUPS, type MuscleGroup } from '../data/exercisePresets'
import { supabase } from '../supabase/client'
import { upsertExerciseMeta } from '../supabase/writeSync'

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
      <label className="text-[13px] font-medium text-muted">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-surface border border-line p-3 text-[16px] text-ink appearance-none focus:border-accent-hover focus:outline-none"
          style={{ borderRadius: '10px' }}
        >
          {includeNone && <option value="">— None —</option>}
          {MUSCLE_GROUPS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" strokeWidth={1.5} />
      </div>
      {error && <p className="text-danger text-[13px]">{error}</p>}
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

    // Save to exercise_meta locally & sync
    await upsertExerciseMeta({
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
    <div className="h-screen bg-ground flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-3 h-14 shrink-0 bg-ground/80 backdrop-blur-md z-20 border-b border-line">
        <button onClick={() => navigate(-1)} className="text-ink p-2 -ml-2 hover:opacity-80">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-medium text-ink absolute left-1/2 -translate-x-1/2">New Exercise</h1>
        <div className="w-10" />
      </header>

      {/* Mode toggle */}
      <div className="px-3 py-3 flex gap-2 border-b border-line">
        <button
          onClick={() => setMode('presets')}
          className={`flex-1 h-10 font-medium text-[15px] transition-colors ${
            mode === 'presets'
              ? 'bg-accent text-ink'
              : 'bg-surface border border-line text-muted'
          }`}
          style={{ borderRadius: '10px' }}
        >
          Presets
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`flex-1 h-10 font-medium text-[15px] transition-colors ${
            mode === 'custom'
              ? 'bg-accent text-ink'
              : 'bg-surface border border-line text-muted'
          }`}
          style={{ borderRadius: '10px' }}
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
                    className="w-full flex items-center justify-between bg-surface border border-line px-3 py-2 hover:bg-surface-high transition-colors"
                    style={{ borderRadius: '16px' }}
                  >
                    <span className="text-[15px] font-medium text-ink">{group}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-muted">{exercises.length}</span>
                      {isExpanded ? (
                        <ChevronDown size={18} strokeWidth={1.5} className="text-muted" />
                      ) : (
                        <ChevronRight size={18} strokeWidth={1.5} className="text-muted" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-2">
                      {exercises.map(ex => (
                        <button
                          key={ex.name}
                          onClick={() => selectPreset(ex)}
                          className="w-full bg-surface border border-line p-2 flex items-center justify-between hover:border-accent-hover transition-colors text-left"
                          style={{ borderRadius: '16px' }}
                        >
                          <span className="text-[15px] font-normal text-ink">{ex.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-surface border border-line p-3 flex flex-col gap-4" style={{ borderRadius: '16px' }}>

            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-muted">
                Exercise Name<span className="text-danger ml-0.5">*</span>
              </label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setNameError('') }}
                className="w-full bg-surface border border-line p-3 text-[16px] text-ink placeholder-muted focus:border-accent-hover focus:outline-none"
                style={{ borderRadius: '10px' }}
                placeholder="e.g., Barbell Bench Press"
              />
              {nameError && <p className="text-danger text-[13px]">{nameError}</p>}
            </div>

            {/* Type */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-muted">Type</label>
              <div className="flex gap-2">
                {EXERCISE_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t.toLowerCase() as 'strength' | 'cardio')}
                    className={`flex-1 h-10 font-medium text-[15px] transition-all ${
                      type === t.toLowerCase()
                        ? 'bg-accent text-ink'
                        : 'border border-line text-ink'
                    }`}
                    style={{ borderRadius: '10px' }}
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
                className="flex items-center justify-between py-2 text-[13px] font-medium text-muted hover:text-ink transition-colors"
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
                  <label className="text-[13px] font-medium text-muted">Coach's Cues</label>
                  <textarea
                    value={cues}
                    onChange={e => setCues(e.target.value)}
                    rows={3}
                    placeholder="e.g., Keep elbows tucked, drive through heels…"
                    className="w-full bg-surface border border-line p-3 text-[15px] text-ink placeholder-muted focus:border-accent-hover focus:outline-none resize-none"
                    style={{ borderRadius: '10px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {mode === 'custom' && (
        <div className="fixed bottom-0 w-full flex flex-col z-50">
          <div className="bg-ground/95 backdrop-blur-md px-3 py-3 border-t border-line">
            <button onClick={save} className="w-full h-12 bg-accent text-ink font-medium text-[15px]" style={{ borderRadius: '10px' }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
