import { useEffect, useState } from 'react'
import { X, Search, Plus, Check, ChevronDown, ChevronRight, Minus } from 'lucide-react'
import { db, type ExercisePreset } from '../db/database'
import { MUSCLE_GROUPS, type MuscleGroup } from '../data/exercisePresets'

interface Props { planId: number; onClose: () => void }

export default function ExerciseModal({ planId, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [presets, setPresets] = useState<ExercisePreset[]>([])
  const [customExercises, setCustomExercises] = useState<{ name: string; muscle: string }[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [setCounts, setSetCounts] = useState<Record<string, number>>({})
  const [expandedGroups, setExpandedGroups] = useState<Set<MuscleGroup>>(new Set(MUSCLE_GROUPS))

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
    await db.plan_exercises.add({ planId, exercise: name, enabled: true, maxSets: sets })
    
    // Ensure exercise exists in exercise_meta
    const existing = await db.exercise_meta.get(name)
    if (!existing) {
      await db.exercise_meta.put({ name })
    }
    
    setAdded(prev => new Set([...prev, name]))
  }

  async function updateModalSets(name: string, delta: number) {
    const current = setCounts[name] ?? 3
    const next = Math.max(1, current + delta)
    setSetCounts(prev => ({ ...prev, [name]: next }))
    if (added.has(name)) {
      const existing = await db.plan_exercises.where('planId').equals(planId).filter(e => e.exercise === name).first()
      if (existing?.id) await db.plan_exercises.update(existing.id, { maxSets: next })
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
    <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col justify-end animate-fadeIn">
      <div className="bg-black w-full h-[90%] border-t border-[#2C2C2E] flex flex-col overflow-hidden animate-slideUp" style={{ borderRadius: '4px 4px 0 0' }}>

        {/* Handle */}
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-[#2C2C2E]" style={{ borderRadius: '2px' }} />
        </div>

        {/* Header */}
        <div className="px-3 flex justify-between items-center mb-3 shrink-0">
          <h2 className="text-[22px] font-medium text-white">Add Exercise</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#1C1C1E] transition-colors" style={{ borderRadius: '2px' }}>
            <X size={20} strokeWidth={1.5} className="text-white" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 mb-3 shrink-0">
          <div className="relative flex items-center">
            <Search size={18} strokeWidth={1.5} className="absolute left-3 text-[#A1A1A6]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] py-2 pl-10 pr-3 text-[17px] text-white focus:border-[#3B82F6] placeholder:text-[#A1A1A6] outline-none"
              style={{ borderRadius: '2px' }}
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

                  {/* Group exercises */}
                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-2">
                      {exercises.map(ex => {
                        const isAdded = added.has(ex.name)
                        return (
                          <div
                            key={ex.name}
                            className={`bg-[#1C1C1E] border border-[#2C2C2E] p-2 flex items-center justify-between ${isAdded ? 'opacity-50' : ''}`}
                            style={{ borderRadius: '4px' }}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[15px] font-normal text-white truncate">{ex.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {/* Set count stepper */}
                              <div className="flex items-center gap-1 bg-[#2C2C2E] border border-[#2C2C2E] px-1 py-0.5" style={{ borderRadius: '2px' }}>
                                <button
                                  onClick={e => { e.stopPropagation(); updateModalSets(ex.name, -1) }}
                                  className="w-5 h-5 flex items-center justify-center text-[#3B82F6]"
                                >
                                  <Minus size={12} strokeWidth={1.5} />
                                </button>
                                <span className="text-[13px] font-medium text-white w-4 text-center tabular-nums">
                                  {setCounts[ex.name] ?? 3}
                                </span>
                                <button
                                  onClick={e => { e.stopPropagation(); updateModalSets(ex.name, 1) }}
                                  className="w-5 h-5 flex items-center justify-center text-[#3B82F6]"
                                >
                                  <Plus size={12} strokeWidth={1.5} />
                                </button>
                              </div>
                              <button
                                onClick={() => addExercise(ex.name, ex.primaryMuscle)}
                                disabled={isAdded}
                                className={`w-7 h-7 flex items-center justify-center transition-colors border ${
                                  isAdded ? 'bg-[#3B82F6]/20 border-[#3B82F6]' : 'border-[#3B82F6] hover:bg-[#3B82F6] hover:text-white'
                                }`}
                                style={{ borderRadius: '2px' }}
                              >
                                {isAdded ? <Check size={14} strokeWidth={1.5} className="text-[#3B82F6]" /> : <Plus size={14} strokeWidth={1.5} className="text-[#3B82F6]" />}
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
                  className="w-full flex items-center justify-between bg-[#1C1C1E] border border-[#2C2C2E] px-3 py-2 hover:bg-[#2a2a2c] transition-colors"
                  style={{ borderRadius: '4px' }}
                >
                  <span className="text-[15px] font-medium text-white">Custom Exercises</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#A1A1A6]">{filteredCustom.length}</span>
                    {expandedGroups.has('Custom' as any) ? (
                      <ChevronDown size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
                    ) : (
                      <ChevronRight size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
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
                          className={`bg-[#1C1C1E] border border-[#2C2C2E] p-2 flex items-center justify-between ${isAdded ? 'opacity-50' : ''}`}
                          style={{ borderRadius: '4px' }}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[15px] font-normal text-white truncate">{ex.name}</h4>
                            <span className="text-[11px] text-[#A1A1A6]">{ex.muscle}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="flex items-center gap-1 bg-[#2C2C2E] border border-[#2C2C2E] px-1 py-0.5" style={{ borderRadius: '2px' }}>
                              <button
                                onClick={e => { e.stopPropagation(); updateModalSets(ex.name, -1) }}
                                className="w-5 h-5 flex items-center justify-center text-[#3B82F6]"
                              >
                                <Minus size={12} strokeWidth={1.5} />
                              </button>
                              <span className="text-[13px] font-medium text-white w-4 text-center tabular-nums">
                                {setCounts[ex.name] ?? 3}
                              </span>
                              <button
                                onClick={e => { e.stopPropagation(); updateModalSets(ex.name, 1) }}
                                className="w-5 h-5 flex items-center justify-center text-[#3B82F6]"
                              >
                                <Plus size={12} strokeWidth={1.5} />
                              </button>
                            </div>
                            <button
                              onClick={() => addExercise(ex.name, ex.muscle)}
                              disabled={isAdded}
                              className={`w-7 h-7 flex items-center justify-center transition-colors border ${
                                isAdded ? 'bg-[#3B82F6]/20 border-[#3B82F6]' : 'border-[#3B82F6] hover:bg-[#3B82F6] hover:text-white'
                              }`}
                              style={{ borderRadius: '2px' }}
                            >
                              {isAdded ? <Check size={14} strokeWidth={1.5} className="text-[#3B82F6]" /> : <Plus size={14} strokeWidth={1.5} className="text-[#3B82F6]" />}
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
              <div className="text-center py-8">
                <p className="text-[#A1A1A6] text-[15px]">No exercises found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-black border-t border-[#2C2C2E] shrink-0">
          <button onClick={onClose} className="w-full bg-[#3B82F6] text-white h-12 font-medium text-[15px]" style={{ borderRadius: '2px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
