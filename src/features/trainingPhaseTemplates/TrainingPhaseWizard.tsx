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
  bulk: { label: 'Bulk', color: '#30D158' },
  cut: { label: 'Cut', color: '#FF9F0A' },
  recomp: { label: 'Recomp', color: '#0A84FF' },
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
    <div className="fixed inset-0 bg-[#151515]/80 z-[70] flex flex-col justify-end">
      <div className="bg-[#1C1C1E] w-full max-h-[92dvh] rounded-t-[4px] border-t border-[#2C2C2E] flex flex-col">
        {/* Handle */}
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-[#353437] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 flex items-center justify-between mb-1 shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
                className="p-1 text-[#A1A1A6]"
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
            )}
            <h2 className="text-[20px] font-semibold text-white">
              {step === 1 && 'Body Stats'}
              {step === 2 && 'Emphasis'}
              {step === 3 && 'Preview Plan'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-[#A1A1A6]">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-4 mb-4 shrink-0">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? '#93032E' : '#2C2C2E' }}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
          {/* ── Step 1: Body Stats ── */}
          {step === 1 && (
            <>
              <p className="text-[15px] text-[#A1A1A6]">
                We'll recommend a goal based on your current body composition.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-[#A1A1A6]">
                  Body Fat % (approximate)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={fatPct}
                    onChange={e => setFatPct(e.target.value)}
                    placeholder="e.g. 18"
                    className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#93032E] focus:outline-none pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A1A1A6]">%</span>
                </div>
                <p className="text-[11px] text-[#A1A1A6]">
                  Not sure? Use visual guides: lean ≈ 10-15%, average ≈ 15-25%, higher ≈ 25%+
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-[#A1A1A6]">Current Body Weight</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={bodyWeight}
                    onChange={e => setBodyWeight(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#93032E] focus:outline-none pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A1A1A6]">kg</span>
                </div>
              </div>

              {/* Goal recommendation preview */}
              {fatPct && (
                <div
                  className="flex items-center gap-2 p-3 rounded-[4px] border"
                  style={{ borderColor: goalInfo.color, background: `${goalInfo.color}18` }}
                >
                  <span className="text-[15px] font-semibold" style={{ color: goalInfo.color }}>
                    Recommended: {goalInfo.label}
                  </span>
                </div>
              )}

              <button
                onClick={handleStepOneNext}
                className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] flex items-center justify-center gap-2 mt-auto"
              >
                Next <ChevronRight size={16} strokeWidth={2} />
              </button>
            </>
          )}

          {/* ── Step 2: Emphasis ── */}
          {step === 2 && (
            <>
              <p className="text-[15px] text-[#A1A1A6]">
                Which muscle groups do you want to prioritise?
              </p>

              <div className="flex flex-col gap-2">
                {EMPHASIS_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setEmphasis(o.value)}
                    className={`w-full text-left p-3 rounded-[4px] border transition-colors ${
                      emphasis === o.value
                        ? 'border-[#93032E] bg-[#93032E]/10'
                        : 'border-[#2C2C2E] bg-[#2C2C2E]/40'
                    }`}
                  >
                    <span
                      className={`text-[15px] font-semibold ${
                        emphasis === o.value ? 'text-[#93032E]' : 'text-white'
                      }`}
                    >
                      {o.label}
                    </span>
                    <p className="text-[13px] text-[#A1A1A6] mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleStepTwoNext}
                className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] flex items-center justify-center gap-2 mt-auto"
              >
                Preview Plan <ChevronRight size={16} strokeWidth={2} />
              </button>
            </>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 3 && preview && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold text-white">{preview.name}</h3>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-[2px]"
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
                  className="bg-[#2C2C2E]/40 rounded-[4px] border border-[#2C2C2E] overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-[#2C2C2E] flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-white">{session.label}</span>
                    <span className="text-[11px] text-[#A1A1A6]">
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][session.day - 1]}
                    </span>
                  </div>
                  {session.exercises.length === 0 ? (
                    <p className="px-3 py-2 text-[13px] text-[#A1A1A6]">Rest day</p>
                  ) : (
                    session.exercises.map((ex, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-3 py-2 ${
                          i > 0 ? 'border-t border-[#2C2C2E]' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] text-white">{ex.name}</span>
                          <span className="text-[11px] text-[#A1A1A6]">{ex.primaryMuscle}</span>
                        </div>
                        <span className="text-[13px] font-medium text-[#A1A1A6]">
                          {ex.sets} × {ex.repMin}–{ex.repMax}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ))}

              <button
                onClick={() => onGenerate(preview)}
                className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] mt-2"
              >
                Use This Plan
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full h-10 text-[#A1A1A6] font-medium text-[14px]"
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
