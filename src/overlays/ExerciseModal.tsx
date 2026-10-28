import { useEffect, useState } from 'react'
import { X, Search, Plus, Check, ChevronDown, ChevronRight, Minus } from 'lucide-react'
import { db, type ExercisePreset } from '../db/database'
import { MUSCLE_GROUPS, type MuscleGroup } from '../data/exercisePresets'
import { addPlanExercise, updatePlanExercise, upsertExerciseMeta } from '../supabase/writeSync'
import { supabase } from '../supabase/client'

const EQUIPMENT_OPTIONS = ['Gym', 'Barbell only', 'Dumbbell only', 'Bodyweight', 'Cables', 'Machine', 'Kettlebell', 'Other'] as const

interface Props { planId: number; onClose: () => void }

export default function ExerciseModal({ planId, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [presets, setPresets] = useState<ExercisePreset[]>([])
  const [customExercises, setCustomExercises] = useState<{ name: string; muscle: string }[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [setCounts, setSetCounts] = useState<Record<string, number>>({})
  const [expandedGroups, setExpandedGroups] = useState<Set<MuscleGroup>>(new Set(MUSCLE_GROUPS))

  // Inline create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createMuscle, setCreateMuscle] = useState<string>(MUSCLE_GROUPS[0])
  const [createEquipment, setCreateEquipment] = useState<string>(EQUIPMENT_OPTIONS[0])
  const [createNameError, setCreateNameError] = useState('')

  async function load() {
    // Load presets
    const allPresets = await db.exercise_presets.toArray()
    setPresets(allPresets)

    // Load custom exercises from gym_sets
    const sets = await db.gym_sets.toArray()
    const unique = new Map<string, { name: string; muscle: string }>()
    sets.forEach(s => {
      if (!unique.has(s.name)) {
        unique.set(s.name, { name: s.name, muscle: s.primaryMuscle || 'Other' })
      }
    })
    setCustomExercises(Array.from(unique.values()))

    // Load already added exercises
    const existing = await db.plan_exercises.where('planId').equals(planId).toArray()
    setAdded(new Set(existing.map(e => e.exercise)))
  }

  useEffect(() => { load() }, [planId])

  async function addExercise(name: string, muscle: string) {
    if (added.has(name)) return
    const sets = setCounts[name] ?? 3
    await addPlanExercise({ planId, exercise: name, enabled: true, maxSets: sets })
    const existing = await db.exercise_meta.get(name)
    if (!existing) {
      await upsertExerciseMeta({ name })
    }
    setAdded(prev => new Set([...prev, name]))
  }

  function openCreateForm() {
    setCreateName(search.trim())
    setCreateMuscle(MUSCLE_GROUPS[0])
    setCreateEquipment(EQUIPMENT_OPTIONS[0])
    setCreateNameError('')
    setShowCreateForm(true)
  }

  async function saveCustomExercise() {
    const trimmed = createName.trim()
    if (!trimmed) { setCreateNameError('Name is required'); return }

    await upsertExerciseMeta({ name: trimmed })

    const existing = await db.gym_sets.where('name').equals(trimmed).first()
    if (!existing) {
      await db.gym_sets.add({
        name: trimmed, reps: 0, weight: 0, unit: 'kg',
        created: new Date().toISOString(), hidden: true,
        bodyWeight: false, duration: 0, distance: 0, cardio: false, restMs: 0,
        primaryMuscle: createMuscle, notes: createEquipment,
      })
    }

    // Push to Supabase custom_exercises
    const { data: { user } } = await supabase.auth.getUser()
    if (user && navigator.onLine) {
      await supabase.from('custom_exercises').upsert({
        user_id: user.id, name: trimmed,
        primary_muscle: createMuscle, equipment: createEquipment,
      })
    }

    await load()
    await addExercise(trimmed, createMuscle)
    setShowCreateForm(false)
    setSearch('')
  }

  async function updateModalSets(name: string, delta: number) {
    const current = setCounts[name] ?? 3
    const next = Math.max(1, current + delta)
    setSetCounts(prev => ({ ...prev, [name]: next }))
    if (added.has(name)) {
      const existing = await db.plan_exercises.where('planId').equals(planId).filter(e => e.exercise === name).first()
      if (existing?.id) await updatePlanExercise(existing.id, { maxSets: next })
    }
  }

  function toggleGroup(group: MuscleGroup) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  // Filter presets by search
  const filteredPresets = presets.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  // Filter custom exercises by search (exclude those already in presets)
  const presetNames = new Set(presets.map(p => p.name))
  const filteredCustom = customExercises.filter(e => 
    !presetNames.has(e.name) && e.name.toLowerCase().includes(search.toLowerCase())
  )

  // Group presets by muscle
  const groupedPresets: Record<MuscleGroup, ExercisePreset[]> = {} as any
  MUSCLE_GROUPS.forEach(g => { groupedPresets[g] = [] })
  filteredPresets.forEach(p => {
    const muscle = p.primaryMuscle as MuscleGroup
    if (groupedPresets[muscle]) {
      groupedPresets[muscle].push(p)
    }
  })

  return (
    <div className="fixed inset-0 bg-ground/80 z-[60] flex flex-col justify-end animate-fadeIn">
      <div className="bg-ground w-full h-[90%] border-t border-line flex flex-col overflow-hidden animate-slideUp" style={{ borderRadius: '20px 20px 0 0' }}>

        {/* Handle */}
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-line" style={{ borderRadius: '10px' }} />
        </div>

        {/* Header */}
        <div className="px-3 flex justify-between items-center mb-3 shrink-0">
          <h2 className="text-[24px] font-medium text-ink">Add Exercise</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface transition-colors" style={{ borderRadius: '10px' }}>
            <X size={20} strokeWidth={1.5} className="text-ink" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 mb-3 shrink-0">
          <div className="relative flex items-center">
            <Search size={18} strokeWidth={1.5} className="absolute left-3 text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-line py-2 pl-10 pr-3 text-[16px] text-ink focus:border-accent-hover placeholder:text-muted outline-none"
              style={{ borderRadius: '10px' }}
              placeholder="Search exercises..."
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="space-y-2">

            {/* Preset exercises grouped by muscle */}
            {MUSCLE_GROUPS.map(group => {
              const exercises = groupedPresets[group]
              if (exercises.length === 0) return null
              const isExpanded = expandedGroups.has(group)

              return (
                <div key={group}>
                  {/* Group header */}
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

                  {/* Group exercises */}
                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-2">
                      {exercises.map(ex => {
                        const isAdded = added.has(ex.name)
                        return (
                          <div
                            key={ex.name}
                            className={`bg-surface border border-line p-2 flex items-center justify-between ${isAdded ? 'opacity-50' : ''}`}
                            style={{ borderRadius: '16px' }}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[15px] font-normal text-ink truncate">{ex.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {/* Set count stepper */}
                              <div className="flex items-center gap-1 bg-line border border-line px-1 py-0.5" style={{ borderRadius: '10px' }}>
                                <button
                                  onClick={e => { e.stopPropagation(); updateModalSets(ex.name, -1) }}
                                  className="w-5 h-5 flex items-center justify-center text-accent-soft"
                                >
                                  <Minus size={12} strokeWidth={1.5} />
                                </button>
                                <span className="text-[13px] font-medium text-ink w-4 text-center tabular-nums">
                                  {setCounts[ex.name] ?? 3}
                                </span>
                                <button
                                  onClick={e => { e.stopPropagation(); updateModalSets(ex.name, 1) }}
                                  className="w-5 h-5 flex items-center justify-center text-accent-soft"
                                >
                                  <Plus size={12} strokeWidth={1.5} />
                                </button>
                              </div>
                              <button
                                onClick={() => addExercise(ex.name, ex.primaryMuscle)}
                                disabled={isAdded}
                                className={`w-7 h-7 flex items-center justify-center transition-colors border ${
                                  isAdded ? 'bg-accent/20 border-accent-hover' : 'border-accent-hover hover:bg-accent hover:text-ink'
                                }`}
                                style={{ borderRadius: '10px' }}
                              >
                                {isAdded ? <Check size={14} strokeWidth={1.5} className="text-accent-soft" /> : <Plus size={14} strokeWidth={1.5} className="text-accent-soft" />}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Custom exercises */}
            {filteredCustom.length > 0 && (
              <div>
                <button
                  onClick={() => toggleGroup('Custom' as any)}
                  className="w-full flex items-center justify-between bg-surface border border-line px-3 py-2 hover:bg-surface-high transition-colors"
                  style={{ borderRadius: '16px' }}
                >
                  <span className="text-[15px] font-medium text-ink">Custom Exercises</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-muted">{filteredCustom.length}</span>
                    {expandedGroups.has('Custom' as any) ? (
                      <ChevronDown size={18} strokeWidth={1.5} className="text-muted" />
                    ) : (
                      <ChevronRight size={18} strokeWidth={1.5} className="text-muted" />
                    )}
                  </div>
                </button>

                {expandedGroups.has('Custom' as any) && (
                  <div className="mt-1 space-y-1 pl-2">
                    {filteredCustom.map(ex => {
                      const isAdded = added.has(ex.name)
                      return (
                        <div
                          key={ex.name}
                          className={`bg-surface border border-line p-2 flex items-center justify-between ${isAdded ? 'opacity-50' : ''}`}
                          style={{ borderRadius: '16px' }}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[15px] font-normal text-ink truncate">{ex.name}</h4>
                            <span className="text-[11px] text-muted">{ex.muscle}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="flex items-center gap-1 bg-line border border-line px-1 py-0.5" style={{ borderRadius: '10px' }}>
                              <button
                                onClick={e => { e.stopPropagation(); updateModalSets(ex.name, -1) }}
                                className="w-5 h-5 flex items-center justify-center text-accent-soft"
                              >
                                <Minus size={12} strokeWidth={1.5} />
                              </button>
                              <span className="text-[13px] font-medium text-ink w-4 text-center tabular-nums">
                                {setCounts[ex.name] ?? 3}
                              </span>
                              <button
                                onClick={e => { e.stopPropagation(); updateModalSets(ex.name, 1) }}
                                className="w-5 h-5 flex items-center justify-center text-accent-soft"
                              >
                                <Plus size={12} strokeWidth={1.5} />
                              </button>
                            </div>
                            <button
                              onClick={() => addExercise(ex.name, ex.muscle)}
                              disabled={isAdded}
                              className={`w-7 h-7 flex items-center justify-center transition-colors border ${
                                isAdded ? 'bg-accent/20 border-accent-hover' : 'border-accent-hover hover:bg-accent hover:text-ink'
                              }`}
                              style={{ borderRadius: '10px' }}
                            >
                              {isAdded ? <Check size={14} strokeWidth={1.5} className="text-accent-soft" /> : <Plus size={14} strokeWidth={1.5} className="text-accent-soft" />}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {filteredPresets.length === 0 && filteredCustom.length === 0 && search && (
              <div className="flex flex-col gap-3">
                <div className="text-center py-4">
                  <p className="text-muted text-[15px]">No exercises found for "{search}"</p>
                </div>

                {!showCreateForm ? (
                  <button
                    onClick={openCreateForm}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-accent-hover text-accent-soft font-medium text-[15px] py-3"
                    style={{ borderRadius: '16px' }}
                  >
                    <Plus size={18} strokeWidth={1.5} />
                    Create custom exercise
                  </button>
                ) : (
                  <div className="bg-surface border border-line p-3 flex flex-col gap-3" style={{ borderRadius: '16px' }}>
                    <span className="text-[13px] font-medium text-muted uppercase tracking-widest">New Exercise</span>

                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-muted">
                        Name<span className="text-danger ml-0.5">*</span>
                      </label>
                      <input
                        value={createName}
                        onChange={e => { setCreateName(e.target.value); setCreateNameError('') }}
                        className="w-full bg-ground border border-line p-2.5 text-[15px] text-ink placeholder-muted focus:border-accent-hover focus:outline-none"
                        style={{ borderRadius: '10px' }}
                        placeholder="Exercise name"
                      />
                      {createNameError && <p className="text-danger text-[13px]">{createNameError}</p>}
                    </div>

                    {/* Muscle group */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-muted">
                        Muscle Group<span className="text-danger ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={createMuscle}
                          onChange={e => setCreateMuscle(e.target.value)}
                          className="w-full bg-ground border border-line p-2.5 text-[15px] text-ink appearance-none focus:border-accent-hover focus:outline-none"
                          style={{ borderRadius: '10px' }}
                        >
                          {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown size={14} strokeWidth={1.5} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      </div>
                    </div>

                    {/* Equipment */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-muted">Equipment</label>
                      <div className="relative">
                        <select
                          value={createEquipment}
                          onChange={e => setCreateEquipment(e.target.value)}
                          className="w-full bg-ground border border-line p-2.5 text-[15px] text-ink appearance-none focus:border-accent-hover focus:outline-none"
                          style={{ borderRadius: '10px' }}
                        >
                          {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        </select>
                        <ChevronDown size={14} strokeWidth={1.5} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="flex-1 h-10 border border-line text-muted font-medium text-[15px]"
                        style={{ borderRadius: '10px' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCustomExercise}
                        className="flex-1 h-10 bg-accent text-ink font-medium text-[15px]"
                        style={{ borderRadius: '10px' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-ground border-t border-line shrink-0">
          <button onClick={onClose} className="w-full bg-accent text-ink h-12 font-medium text-[15px]" style={{ borderRadius: '10px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
