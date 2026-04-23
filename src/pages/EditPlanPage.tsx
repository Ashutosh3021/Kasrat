import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, GripVertical } from 'lucide-react'
import { db, type Plan, type PlanExercise } from '../db/database'
import Toggle from '../components/Toggle'
import { useUIStore } from '../store/uiStore'
import ExerciseModal from '../overlays/ExerciseModal'
import DeleteConfirmation from '../overlays/DeleteConfirmation'
import { useDragToReorder } from '../hooks/useDragToReorder'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function EditPlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [title, setTitle] = useState('')
  const [activeDays, setActiveDays] = useState<number[]>([])
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const { openExerciseModal, exerciseModalOpen, closeExerciseModal, openDeleteConfirm, deleteConfirmOpen, deleteConfirmTarget, closeDeleteConfirm } = useUIStore()

  async function load() {
    if (!id) return
    const p = await db.plans.get(Number(id))
    if (!p) return
    setPlan(p)
    setTitle(p.title)
    setActiveDays(p.days.split(',').map(Number).filter(n => !isNaN(n)))
    const exs = await db.plan_exercises.where('planId').equals(Number(id)).toArray()
    setExercises(exs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
  }

  useEffect(() => { load() }, [id])

  async function save() {
    if (!plan?.id) return
    await db.plans.update(plan.id, {
      title,
      days: activeDays.join(','),
      exercises: exercises.filter(e => e.enabled).map(e => e.exercise).join(',')
    })
    navigate(-1)
  }

  async function deletePlan() {
    if (!plan?.id) return
    await db.plans.delete(plan.id)
    await db.plan_exercises.where('planId').equals(plan.id).delete()
    navigate('/plans')
  }

  function toggleDay(d: number) {
    setActiveDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function toggleExercise(ex: PlanExercise) {
    await db.plan_exercises.update(ex.id!, { enabled: !ex.enabled })
    load()
  }

  async function handleExerciseAdded() {
    closeExerciseModal()
    load()
  }

  async function handleReorder(newItems: PlanExercise[]) {
    setExercises(newItems)
    // Persist new order by updating each exercise's sort order
    await Promise.all(
      newItems.map((ex, i) => db.plan_exercises.update(ex.id!, { sortOrder: i }))
    )
  }

  const { getHandleProps, getItemProps } = useDragToReorder(exercises, handleReorder)

  async function handleDeleteConfirm() {
    if (deleteConfirmTarget?.type === 'plan') {
      await deletePlan()
    }
    closeDeleteConfirm()
  }

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-md flex justify-between items-center px-4 h-14 border-b border-[#353437]">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-white hover:bg-[#1b1b1d] rounded-full">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">Edit Plan</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col px-4 py-6 gap-8">
        <section className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#c2c6d6] px-1">Plan Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-[#1b1b1d] text-white text-[17px] rounded-lg p-3 w-full border border-transparent focus:border-[#adc6ff] focus:outline-none placeholder-[#8c909f]"
          />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#c2c6d6] px-1">Active Days</span>
          <div className="flex justify-between items-center bg-[#1b1b1d] p-3 rounded-lg">
            {[0, 1, 2, 3, 4, 5, 6].map((d, i) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[15px] transition-all ${
                  activeDays.includes(d) ? 'bg-[#adc6ff] text-[#002e6a]' : 'bg-[#131315] text-[#c2c6d6]'
                }`}
              >
                {DAYS[i]}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-semibold text-white">Exercises</h2>
          <div className="flex flex-col gap-4" data-drag-list>
            {exercises.map((ex, i) => (
              <div key={ex.id} className="bg-[#1b1b1d] p-3 rounded-lg flex items-center gap-4" {...getItemProps(i)}>
                <span {...getHandleProps(i)}>
                  <GripVertical size={20} className="text-[#424754]" />
                </span>
                <div className="flex-1 flex flex-col">
                  <span className="text-[17px] text-white">{ex.exercise}</span>
                  <span className="text-[13px] font-medium text-[#c2c6d6] mt-0.5">{ex.maxSets} sets</span>
                </div>
                <Toggle checked={ex.enabled} onChange={() => toggleExercise(ex)} />
              </div>
            ))}
          </div>
          <button
            onClick={() => plan?.id && openExerciseModal(plan.id)}
            className="border border-[#424754] text-[#adc6ff] rounded-lg min-h-[48px] py-3 flex items-center justify-center gap-2 font-semibold text-[15px] w-full"
          >
            <Plus size={20} />
            Add Exercise
          </button>
        </section>

        <div className="flex-1" />

        <section className="mt-8 flex flex-col gap-4 pb-8">
          <button onClick={save} className="bg-[#adc6ff] text-[#002e6a] rounded-lg min-h-[48px] flex justify-center items-center font-semibold text-[15px] w-full">
            Save
          </button>
          <button
            onClick={() => plan?.id && openDeleteConfirm({ type: 'plan', id: plan.id, name: plan.title })}
            className="text-[#ffb4ab] font-semibold text-[15px] w-full flex justify-center py-3"
          >
            Delete Plan
          </button>
        </section>
      </main>

      {exerciseModalOpen && plan?.id && (
        <ExerciseModal planId={plan.id} onClose={handleExerciseAdded} />
      )}
      {deleteConfirmOpen && (
        <DeleteConfirmation target={deleteConfirmTarget!} onConfirm={handleDeleteConfirm} onCancel={closeDeleteConfirm} />
      )}
    </div>
  )
}
