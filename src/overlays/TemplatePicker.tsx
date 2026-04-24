import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, CheckCircle } from 'lucide-react'
import { db } from '../db/database'
import { PROGRAM_TEMPLATES, type ProgramTemplate } from '../data/templates'

interface Props {
  onClose: () => void
}

// Default days for each template
const TEMPLATE_DAYS: Record<string, number[]> = {
  'ppl-up-5': [1, 2, 3, 4, 5],   // Mon–Fri
  'ppl-3':    [1, 3, 5],          // Mon/Wed/Fri
}

function totalExercises(t: ProgramTemplate): number {
  return t.days.reduce((acc, d) => acc + d.exercises.length, 0)
}

export default function TemplatePicker({ onClose }: Props) {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState('')

  async function useTemplate(template: ProgramTemplate) {
    if (creating) return
    setCreating(true)
    try {
      const days = TEMPLATE_DAYS[template.id] ?? [1, 3, 5]
      const allExerciseNames = template.days.flatMap(d => d.exercises.map(e => e.name))

      // Create the plan
      const count = await db.plans.count()
      const planId = await db.plans.add({
        sequence: count,
        title: template.name,
        exercises: allExerciseNames.join(','),
        days: days.join(','),
      })

      // Create plan_exercises for each day's exercises
      let sortOrder = 0
      for (const day of template.days) {
        for (const ex of day.exercises) {
          await db.plan_exercises.add({
            planId: planId as number,
            exercise: ex.name,
            enabled: true,
            maxSets: ex.sets,
            sortOrder: sortOrder++,
          })
          // Ensure exercise exists in gym_sets as a template row
          const existing = await db.gym_sets.where('name').equals(ex.name).first()
          if (!existing) {
            await db.gym_sets.add({
              name: ex.name,
              reps: 0,
              weight: 0,
              unit: 'kg',
              created: new Date().toISOString(),
              hidden: true,
              bodyWeight: false,
              duration: 0,
              distance: 0,
              cardio: false,
              restMs: 0,
              primaryMuscle: 'Other',
            })
          }
        }
      }

      setToast('Plan created from template!')
      setTimeout(() => {
        onClose()
        navigate(`/edit-plan/${planId}`)
      }, 900)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex flex-col justify-end animate-fadeIn">
      <div className="bg-[#1C1C1E] w-full max-h-[90dvh] rounded-t-2xl border-t border-[#2C2C2E] flex flex-col overflow-hidden animate-slideUp">
        {/* Handle */}
        <div className="w-12 h-1 bg-[#353437] rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="px-4 flex items-center justify-between py-3 shrink-0">
          <h2 className="text-[22px] font-semibold text-white">Program Templates</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#2C2C2E] rounded-full">
            <X size={20} className="text-white" />
          </button>
        </div>

        <p className="px-4 text-[13px] text-[#A1A1A6] pb-3 shrink-0">
          Choose a template to create a ready-made plan. You can edit it after.
        </p>

        {/* Template cards */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-4">
          {PROGRAM_TEMPLATES.map(t => (
            <div
              key={t.id}
              className="bg-[#131315] border border-[#2C2C2E] rounded-2xl overflow-hidden"
            >
              {/* Card header */}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-bold text-white">{t.name}</h3>
                    {t.description && (
                      <p className="text-[13px] text-[#A1A1A6] mt-0.5">{t.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[12px] font-semibold bg-[#3B82F6]/15 text-[#3B82F6] px-2 py-0.5 rounded-full">
                      {t.days.length} days
                    </span>
                    <span className="text-[12px] text-[#A1A1A6]">{totalExercises(t)} exercises</span>
                  </div>
                </div>

                {/* Day breakdown */}
                <div className="flex flex-col gap-1.5 mt-1">
                  {t.days.map(day => (
                    <div key={day.dayLabel} className="flex items-center gap-2">
                      <ChevronRight size={12} className="text-[#424754] shrink-0" />
                      <span className="text-[13px] text-[#c2c6d6]">
                        <span className="font-medium text-white">{day.dayLabel}</span>
                        {' — '}{day.exercises.length} exercises
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Use button */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => useTemplate(t)}
                  disabled={creating}
                  className="w-full h-11 bg-[#3B82F6] text-white rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  Use this template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-[#1C1C1E] border border-[#3B82F6]/40 text-white text-[15px] font-medium px-5 py-3 rounded-2xl flex items-center gap-2 shadow-2xl animate-fadeIn">
          <CheckCircle size={18} className="text-[#3B82F6]" />
          {toast}
        </div>
      )}
    </div>
  )
}
