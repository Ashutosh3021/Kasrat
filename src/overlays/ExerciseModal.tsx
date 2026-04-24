import { useEffect, useState } from 'react'
import { X, Search, Plus, Check, ArrowLeft, ChevronRight } from 'lucide-react'
import { db } from '../db/database'
import { MuscleSelect } from '../pages/AddExercisePage'

interface Props { planId: number; onClose: () => void }

type CreateStep = 'equipment' | 'type' | 'name'

interface CreateState {
  equipment: 'gym' | 'bodyweight' | null
  type: 'strength' | 'cardio' | null
  name: string
  primaryMuscle: string
  secondaryMuscle: string
}

const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Cardio']

export default function ExerciseModal({ planId, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [exercises, setExercises] = useState<{ name: string; category: string; cardio: boolean }[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())

  // Create flow
  const [creating, setCreating] = useState(false)
  const [createStep, setCreateStep] = useState<CreateStep>('equipment')
  const [createState, setCreateState] = useState<CreateState>({ equipment: null, type: null, name: '', primaryMuscle: 'Chest', secondaryMuscle: '' })
  const [nameError, setNameError] = useState('')

  async function load() {
    const sets = await db.gym_sets.toArray()
    const unique = new Map<string, { name: string; category: string; cardio: boolean }>()
    sets.forEach(s => {
      if (!unique.has(s.name)) {
        unique.set(s.name, { name: s.name, category: s.notes ?? (s.cardio ? 'Cardio' : 'Strength'), cardio: s.cardio })
      }
    })
    setExercises(Array.from(unique.values()))

    const existing = await db.plan_exercises.where('planId').equals(planId).toArray()
    setAdded(new Set(existing.map(e => e.exercise)))
  }

  useEffect(() => { load() }, [planId])

  async function addExercise(name: string) {
    if (added.has(name)) return
    await db.plan_exercises.add({ planId, exercise: name, enabled: true, maxSets: 3 })
    setAdded(prev => new Set([...prev, name]))
  }

  // ── Create flow handlers ──────────────────────────────────────────────────

  function startCreate() {
    setCreating(true)
    setCreateStep('equipment')
    setCreateState({ equipment: null, type: null, name: '', primaryMuscle: 'Chest', secondaryMuscle: '' })
    setNameError('')
  }

  function cancelCreate() {
    setCreating(false)
  }

  function pickEquipment(eq: 'gym' | 'bodyweight') {
    setCreateState(s => ({ ...s, equipment: eq }))
    setCreateStep('type')
  }

  function pickType(t: 'strength' | 'cardio') {
    setCreateState(s => ({ ...s, type: t }))
    setCreateStep('name')
  }

  async function saveCustomExercise() {
    const trimmed = createState.name.trim()
    if (!trimmed) { setNameError('Please enter a name'); return }
    if (exercises.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameError('An exercise with this name already exists')
      return
    }

    const isCardio = createState.type === 'cardio'
    const category = createState.equipment === 'bodyweight' ? 'Bodyweight' : (isCardio ? 'Cardio' : 'Strength')

    // Persist as a "template" gym_set with hidden=true so it shows up in the list
    await db.gym_sets.add({
      name: trimmed,
      reps: 0,
      weight: 0,
      unit: isCardio ? 'km' : 'kg',
      created: new Date().toISOString(),
      hidden: true,
      bodyWeight: createState.equipment === 'bodyweight',
      duration: 0,
      distance: 0,
      cardio: isCardio,
      restMs: 0,
      notes: category,
      primaryMuscle: createState.primaryMuscle || 'Other',
      secondaryMuscle: createState.secondaryMuscle || undefined,
    })

    // Immediately add to the plan
    await db.plan_exercises.add({ planId, exercise: trimmed, enabled: true, maxSets: 3 })

    await load()
    setAdded(prev => new Set([...prev, trimmed]))
    setCreating(false)
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filter === 'All' || e.category === filter
    return matchSearch && matchCat
  })

  const noResults = filtered.length === 0 && search.trim().length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col justify-end animate-fadeIn">
      <div className="bg-black w-full h-[90%] rounded-t-[12px] border-t border-[#2C2C2E] flex flex-col overflow-hidden shadow-2xl animate-slideUp">

        {/* Handle */}
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-[#2C2C2E] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 flex justify-between items-center mb-4 shrink-0">
          {creating ? (
            <button onClick={cancelCreate} className="p-2 -ml-2 text-[#3B82F6] hover:opacity-80">
              <ArrowLeft size={22} />
            </button>
          ) : (
            <h2 className="text-[22px] font-semibold text-white">Add Exercise</h2>
          )}
          {creating && (
            <h2 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">
              {createStep === 'equipment' ? 'Equipment' : createStep === 'type' ? 'Exercise Type' : 'Name It'}
            </h2>
          )}
          <button onClick={onClose} className="p-2 hover:bg-[#1C1C1E] rounded-full transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* ── CREATE FLOW ── */}
        {creating ? (
          <div className="flex-1 overflow-y-auto px-4 pb-10">

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
              {(['equipment', 'type', 'name'] as CreateStep[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${
                    createStep === s ? 'bg-[#3B82F6] text-white' :
                    (['equipment', 'type', 'name'].indexOf(createStep) > i) ? 'bg-[#3B82F6]/30 text-[#3B82F6]' :
                    'bg-[#2C2C2E] text-[#8c909f]'
                  }`}>
                    {i + 1}
                  </div>
                  {i < 2 && <div className={`h-px w-8 transition-colors ${(['equipment', 'type', 'name'].indexOf(createStep) > i) ? 'bg-[#3B82F6]' : 'bg-[#2C2C2E]'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1 — Equipment */}
            {createStep === 'equipment' && (
              <div className="flex flex-col gap-4">
                <p className="text-[#c2c6d6] text-[15px] mb-2">Where will you do this exercise?</p>
                <button
                  onClick={() => pickEquipment('gym')}
                  className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform hover:border-[#3B82F6] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#2C2C2E] flex items-center justify-center text-2xl group-hover:bg-[#3B82F6]/10 transition-colors">
                      🏋️
                    </div>
                    <div className="text-left">
                      <p className="text-[17px] font-semibold text-white">Gym</p>
                      <p className="text-[13px] text-[#8c909f]">Machines, barbells, dumbbells</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#8c909f] group-hover:text-[#3B82F6] transition-colors" />
                </button>
                <button
                  onClick={() => pickEquipment('bodyweight')}
                  className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform hover:border-[#3B82F6] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#2C2C2E] flex items-center justify-center text-2xl group-hover:bg-[#3B82F6]/10 transition-colors">
                      🤸
                    </div>
                    <div className="text-left">
                      <p className="text-[17px] font-semibold text-white">Bodyweight</p>
                      <p className="text-[13px] text-[#8c909f]">No equipment needed</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#8c909f] group-hover:text-[#3B82F6] transition-colors" />
                </button>
              </div>
            )}

            {/* Step 2 — Type */}
            {createStep === 'type' && (
              <div className="flex flex-col gap-4">
                <p className="text-[#c2c6d6] text-[15px] mb-2">What kind of exercise is it?</p>
                <button
                  onClick={() => pickType('strength')}
                  className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform hover:border-[#3B82F6] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#2C2C2E] flex items-center justify-center text-2xl group-hover:bg-[#3B82F6]/10 transition-colors">
                      💪
                    </div>
                    <div className="text-left">
                      <p className="text-[17px] font-semibold text-white">Strength Training</p>
                      <p className="text-[13px] text-[#8c909f]">Tracks weight & reps</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#8c909f] group-hover:text-[#3B82F6] transition-colors" />
                </button>
                <button
                  onClick={() => pickType('cardio')}
                  className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform hover:border-[#3B82F6] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#2C2C2E] flex items-center justify-center text-2xl group-hover:bg-[#3B82F6]/10 transition-colors">
                      🏃
                    </div>
                    <div className="text-left">
                      <p className="text-[17px] font-semibold text-white">Cardio</p>
                      <p className="text-[13px] text-[#8c909f]">Tracks distance & duration</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#8c909f] group-hover:text-[#3B82F6] transition-colors" />
                </button>
              </div>
            )}

            {/* Step 3 — Name */}
            {createStep === 'name' && (
              <div className="flex flex-col gap-6">
                {/* Summary chips */}
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] text-[13px] font-semibold capitalize">
                    {createState.equipment === 'bodyweight' ? '🤸 Bodyweight' : '🏋️ Gym'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] text-[13px] font-semibold capitalize">
                    {createState.type === 'cardio' ? '🏃 Cardio' : '💪 Strength'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-[#c2c6d6]">Exercise Name</label>
                  <input
                    autoFocus
                    value={createState.name}
                    onChange={e => { setCreateState(s => ({ ...s, name: e.target.value })); setNameError('') }}
                    onKeyDown={e => e.key === 'Enter' && saveCustomExercise()}
                    className="w-full bg-[#1C1C1E] border border-[#424754] rounded-xl p-4 text-[17px] text-white placeholder-[#474649] focus:border-[#3B82F6] focus:outline-none transition-colors"
                    placeholder={createState.type === 'cardio' ? 'e.g., Cycling, Swimming…' : 'e.g., Bulgarian Split Squat…'}
                  />
                  {nameError && (
                    <p className="text-[#FF453A] text-[13px] font-medium">{nameError}</p>
                  )}
                </div>

                {/* Muscle groups */}
                <MuscleSelect
                  label="Primary Muscle Group"
                  value={createState.primaryMuscle}
                  onChange={v => setCreateState(s => ({ ...s, primaryMuscle: v }))}
                  required
                />
                <MuscleSelect
                  label="Secondary Muscle Group"
                  value={createState.secondaryMuscle}
                  onChange={v => setCreateState(s => ({ ...s, secondaryMuscle: v }))}
                  includeNone
                />

                <button
                  onClick={saveCustomExercise}
                  className="w-full h-12 bg-[#3B82F6] text-white rounded-xl font-semibold text-[15px] active:scale-[0.98] transition-transform"
                >
                  Create & Add to Plan
                </button>
              </div>
            )}
          </div>

        ) : (
          /* ── SEARCH / LIST VIEW ── */
          <>
            {/* Search bar */}
            <div className="px-4 mb-4 shrink-0">
              <div className="relative flex items-center">
                <Search size={18} className="absolute left-3 text-[#c2c6d6]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[#1C1C1E] border-none rounded-xl py-3 pl-10 pr-4 text-[17px] text-white focus:ring-1 focus:ring-[#4d8eff] placeholder:text-[#474649] outline-none"
                  placeholder="Search exercises..."
                />
              </div>
            </div>

            {/* Category pills */}
            <div className="px-4 flex gap-2 overflow-x-auto pb-4 shrink-0">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`px-5 py-2 rounded-full font-semibold text-[15px] whitespace-nowrap transition-colors ${
                    filter === c ? 'bg-[#4d8eff] text-[#00285d]' : 'bg-[#2C2C2E] text-white hover:bg-[#353437]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-3">

                {/* "Create your own" — always shown when searching with no results, or as a persistent card at top when search is empty */}
                {noResults ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-[#8c909f] text-[15px] text-center py-4">
                      No results for "<span className="text-white">{search}</span>"
                    </p>
                    <button
                      onClick={startCreate}
                      className="bg-[#1C1C1E] border border-dashed border-[#3B82F6] rounded-xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform w-full text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center shrink-0">
                        <Plus size={24} className="text-[#3B82F6]" />
                      </div>
                      <div>
                        <p className="text-[17px] font-semibold text-[#3B82F6]">Create "{search}"</p>
                        <p className="text-[13px] text-[#8c909f]">Add a custom exercise to your library</p>
                      </div>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Persistent "create custom" card at the bottom of results */}
                    {filtered.map(ex => {
                      const isAdded = added.has(ex.name)
                      return (
                        <div
                          key={ex.name}
                          className={`bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform ${isAdded ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-[#353437] flex items-center justify-center text-2xl">
                              {ex.cardio ? '🏃' : ex.category === 'Bodyweight' ? '🤸' : '🏋️'}
                            </div>
                            <div>
                              <h4 className="text-[17px] text-white">{ex.name}</h4>
                              <span className="text-[#c2c6d6] text-[13px] font-medium">{ex.category}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => addExercise(ex.name)}
                            disabled={isAdded}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              isAdded ? 'bg-[#4d8eff]/20' : 'border border-[#4d8eff] hover:bg-[#4d8eff] hover:text-[#00285d]'
                            }`}
                          >
                            {isAdded ? <Check size={16} className="text-[#4d8eff]" /> : <Plus size={16} className="text-[#4d8eff]" />}
                          </button>
                        </div>
                      )
                    })}

                    {/* Create custom — always at the bottom */}
                    <button
                      onClick={startCreate}
                      className="bg-[#1C1C1E] border border-dashed border-[#2C2C2E] rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform w-full text-left hover:border-[#3B82F6] group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-[#2C2C2E] flex items-center justify-center group-hover:bg-[#3B82F6]/10 transition-colors shrink-0">
                        <Plus size={22} className="text-[#8c909f] group-hover:text-[#3B82F6] transition-colors" />
                      </div>
                      <div>
                        <p className="text-[17px] font-semibold text-[#c2c6d6] group-hover:text-[#3B82F6] transition-colors">Create custom exercise</p>
                        <p className="text-[13px] text-[#8c909f]">Not finding what you need?</p>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-black border-t border-[#2C2C2E] shrink-0">
              <button onClick={onClose} className="w-full bg-[#4d8eff] text-white h-12 rounded-xl font-semibold text-[15px] active:opacity-70 transition-opacity">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
