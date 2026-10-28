/**
 * Feature 5: Training Phase Templates — Wizard Modal
 *
 * A 3-step bottom sheet wizard:
 *   Step 1: Body fat % + weight
 *   Step 2: Muscle emphasis
 *   Step 3: Preview generated plan → confirm
 *
 * Usage:
 *   <TrainingPhaseWizard onClose={() => setOpen(false)} onGenerate={(template) => handleTemplate(template)} />
 */

import { useState } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { generateTemplate, recommendGoal } from './templateGenerator'
import type { WizardInputs, WizardEmphasis, WizardTemplate, WizardGoalType } from './wizardTypes'

interface TrainingPhaseWizardProps {
  onClose: () => void
  onGenerate: (template: WizardTemplate) => void
}

const EMPHASIS_OPTIONS: { value: WizardEmphasis; label: string; desc: string }[] = [
  { value: 'balanced', label: 'Balanced', desc: 'Equal volume across all muscle groups' },
  { value: 'arms', label: 'Arms', desc: '+20% volume on biceps & triceps' },
  { value: 'chest', label: 'Chest', desc: 'Extra chest exercise per push session' },
  { value: 'back', label: 'Back', desc: 'Extra pulling movement per pull session' },
  { value: 'legs', label: 'Legs', desc: 'Extra leg exercise, squats first' },
]

const GOAL_LABELS: Record<WizardGoalType, { label: string; color: string }> = {
  bulk: { label: 'Bulk', color: 'var(--color-success)' },
  cut: { label: 'Cut', color: 'var(--color-warning)' },
  recomp: { label: 'Recomp', color: 'var(--color-info)' },
}

export default function TrainingPhaseWizard({ onClose, onGenerate }: TrainingPhaseWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [fatPct, setFatPct] = useState('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [emphasis, setEmphasis] = useState<WizardEmphasis>('balanced')
  const [preview, setPreview] = useState<WizardTemplate | null>(null)

  function handleStepOneNext() {
    const inputs: WizardInputs = {
      fatPercentage: fatPct ? parseFloat(fatPct) : null,
      bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
      emphasis,
    }
    const template = generateTemplate(inputs)
    setPreview(template)
    setStep(2)
  }

  function handleStepTwoNext() {
    if (!preview) return
    // Regenerate with updated emphasis
    const inputs: WizardInputs = {
      fatPercentage: fatPct ? parseFloat(fatPct) : null,
      bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
      emphasis,
    }
    setPreview(generateTemplate(inputs))
    setStep(3)
  }

  const recommendedGoal = recommendGoal(fatPct ? parseFloat(fatPct) : null)
  const goalInfo = GOAL_LABELS[recommendedGoal]

  return (
    <div className="fixed inset-0 bg-ground/80 z-[70] flex flex-col justify-end">
      <div className="bg-surface w-full max-h-[92dvh] rounded-t-[4px] border-t border-line flex flex-col">
        {/* Handle */}
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-line-strong rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 flex items-center justify-between mb-1 shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
                className="p-1 text-muted"
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
            )}
            <h2 className="text-[20px] font-semibold text-ink">
              {step === 1 && 'Body Stats'}
              {step === 2 && 'Emphasis'}
              {step === 3 && 'Preview Plan'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-4 mb-4 shrink-0">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? 'var(--color-accent-soft)' : 'var(--color-line)' }}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
          {/* ── Step 1: Body Stats ── */}
          {step === 1 && (
            <>
              <p className="text-[15px] text-muted">
                We'll recommend a goal based on your current body composition.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-muted">
                  Body Fat % (approximate)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={fatPct}
                    onChange={e => setFatPct(e.target.value)}
                    placeholder="e.g. 18"
                    className="w-full bg-line border border-line rounded-2xl px-3 py-2 text-[16px] text-ink focus:border-accent-hover focus:outline-none pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">%</span>
                </div>
                <p className="text-[11px] text-muted">
                  Not sure? Use visual guides: lean ≈ 10-15%, average ≈ 15-25%, higher ≈ 25%+
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-muted">Current Body Weight</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={bodyWeight}
                    onChange={e => setBodyWeight(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full bg-line border border-line rounded-2xl px-3 py-2 text-[16px] text-ink focus:border-accent-hover focus:outline-none pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">kg</span>
                </div>
              </div>

              {/* Goal recommendation preview */}
              {fatPct && (
                <div
                  className="flex items-center gap-2 p-3 rounded-2xl border"
                  style={{ borderColor: goalInfo.color, background: `${goalInfo.color}18` }}
                >
                  <span className="text-[15px] font-semibold" style={{ color: goalInfo.color }}>
                    Recommended: {goalInfo.label}
                  </span>
                </div>
              )}

              <button
                onClick={handleStepOneNext}
                className="w-full h-12 bg-accent text-ink font-semibold text-[15px] rounded-lg flex items-center justify-center gap-2 mt-auto"
              >
                Next <ChevronRight size={16} strokeWidth={2} />
              </button>
            </>
          )}

          {/* ── Step 2: Emphasis ── */}
          {step === 2 && (
            <>
              <p className="text-[15px] text-muted">
                Which muscle groups do you want to prioritise?
              </p>

              <div className="flex flex-col gap-2">
                {EMPHASIS_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setEmphasis(o.value)}
                    className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                      emphasis === o.value
                        ? 'border-accent-hover bg-accent/10'
                        : 'border-line bg-line/40'
                    }`}
                  >
                    <span
                      className={`text-[15px] font-semibold ${
                        emphasis === o.value ? 'text-accent-soft' : 'text-ink'
                      }`}
                    >
                      {o.label}
                    </span>
                    <p className="text-[13px] text-muted mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleStepTwoNext}
                className="w-full h-12 bg-accent text-ink font-semibold text-[15px] rounded-lg flex items-center justify-center gap-2 mt-auto"
              >
                Preview Plan <ChevronRight size={16} strokeWidth={2} />
              </button>
            </>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 3 && preview && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-ink">{preview.name}</h3>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-lg"
                  style={{
                    color: GOAL_LABELS[preview.goalType].color,
                    background: `${GOAL_LABELS[preview.goalType].color}20`,
                  }}
                >
                  {GOAL_LABELS[preview.goalType].label.toUpperCase()}
                </span>
              </div>

              {preview.sessions.map(session => (
                <div
                  key={session.day}
                  className="bg-line/40 rounded-2xl border border-line overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-line flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-ink">{session.label}</span>
                    <span className="text-[11px] text-muted">
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][session.day - 1]}
                    </span>
                  </div>
                  {session.exercises.length === 0 ? (
                    <p className="px-3 py-2 text-[13px] text-muted">Rest day</p>
                  ) : (
                    session.exercises.map((ex, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-3 py-2 ${
                          i > 0 ? 'border-t border-line' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] text-ink">{ex.name}</span>
                          <span className="text-[11px] text-muted">{ex.primaryMuscle}</span>
                        </div>
                        <span className="text-[13px] font-medium text-muted">
                          {ex.sets} × {ex.repMin}–{ex.repMax}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ))}

              <button
                onClick={() => onGenerate(preview)}
                className="w-full h-12 bg-accent text-ink font-semibold text-[15px] rounded-lg mt-2"
              >
                Use This Plan
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full h-10 text-muted font-medium text-[14px]"
              >
                Start Over
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
