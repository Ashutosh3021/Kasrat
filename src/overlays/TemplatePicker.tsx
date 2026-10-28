import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, CheckCircle } from 'lucide-react'
import { db } from '../db/database'
import { PROGRAM_TEMPLATES, type ProgramTemplate } from '../data/templates'
import { addPlan, addPlanExercise } from '../supabase/writeSync'

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

      const count = await db.plans.count()
      const planId = await addPlan({
        sequence: count,
        title: template.name,
        exercises: allExerciseNames.join(','),
        days: days.join(','),
      })

      let sortOrder = 0
      for (const day of template.days) {
        for (const ex of day.exercises) {
          await addPlanExercise({
            planId: planId as number,
            exercise: ex.name,
            enabled: true,
            maxSets: ex.sets,
            sortOrder: sortOrder++,
          })
          const existing = await db.gym_sets.where('name').equals(ex.name).first()
          if (!existing) {
            await db.gym_sets.add({
              name: ex.name, reps: 0, weight: 0, unit: 'kg',
              created: new Date().toISOString(), hidden: true,
              bodyWeight: false, duration: 0, distance: 0, cardio: false,
              restMs: 0, primaryMuscle: 'Other',
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
    <div className="fixed inset-0 bg-ground/80 z-[70] flex flex-col justify-end animate-fadeIn">
      <div className="bg-surface w-full max-h-[90dvh] rounded-t-[4px] border-t border-line flex flex-col overflow-hidden animate-slideUp">
        {/* Handle */}
        <div className="w-12 h-1 bg-line-strong rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="px-3 flex items-center justify-between py-3 shrink-0">
          <h2 className="text-[24px] font-semibold text-ink">Program Templates</h2>
          <button onClick={onClose} className="p-2 hover:bg-line rounded-lg">
            <X size={20} strokeWidth={1.5} className="text-ink" />
          </button>
        </div>

        <p className="px-3 text-[13px] text-muted pb-3 shrink-0">
          Choose a template to create a ready-made plan. You can edit it after.
        </p>

        {/* Template cards */}
        <div className="flex-1 overflow-y-auto px-3 pb-8 flex flex-col gap-3">
          {PROGRAM_TEMPLATES.map(t => (
            <div
              key={t.id}
              className="bg-ground-deep border border-line rounded-2xl overflow-hidden"
            >
              {/* Card header */}
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[16px] font-semibold text-ink">{t.name}</h3>
                    {t.description && (
                      <p className="text-[13px] text-muted mt-0.5">{t.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[12px] font-semibold bg-accent/15 text-accent-soft px-2 py-0.5 rounded-lg">
                      {t.days.length} days
                    </span>
                    <span className="text-[12px] text-muted">{totalExercises(t)} exercises</span>
                  </div>
                </div>

                {/* Day breakdown */}
                <div className="flex flex-col gap-1.5 mt-1">
                  {t.days.map(day => (
                    <div key={day.dayLabel} className="flex items-center gap-2">
                      <ChevronRight size={12} strokeWidth={1.5} className="text-muted-dim shrink-0" />
                      <span className="text-[13px] text-muted">
                        <span className="font-medium text-ink">{day.dayLabel}</span>
                        {' — '}{day.exercises.length} exercises
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Use button */}
              <div className="px-3 pb-3">
                <button
                  onClick={() => useTemplate(t)}
                  disabled={creating}
                  className="w-full h-11 bg-accent text-ink rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-surface border border-accent-hover/40 text-ink text-[15px] font-medium px-3 py-2 rounded-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle size={18} strokeWidth={1.5} className="text-accent-soft" />
          {toast}
        </div>
      )}
    </div>
  )
}
