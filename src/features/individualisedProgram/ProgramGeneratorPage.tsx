/**
 * Feature 12: Individualised Program Generation — Generator Page
 *
 * 6-step wizard: days → goal → emphasis → level → equipment → preview
 * Each session is saved as its own distinct Plan so they appear separately
 * in the plans list.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import {
  generateIndividualisedPlan,
  saveGeneratedPlan,
  type ExperienceLevel,
  type EquipmentType,
  type ProgramInputs,
  type TrainingDays,
} from './programGenerator'
import type { WizardGoalType, WizardEmphasis } from '../trainingPhaseTemplates/wizardTypes'

type Step = 'days' | 'goal' | 'emphasis' | 'level' | 'equipment' | 'preview'
const STEPS: Step[] = ['days', 'goal', 'emphasis', 'level', 'equipment', 'preview']

// ─── Option data ──────────────────────────────────────────────────────────────

const DAYS_OPTIONS: { value: TrainingDays; label: string; splitName: string; desc: string }[] = [
  { value: 3, label: '3 Days', splitName: 'Full Body',       desc: 'Full Body A / B / C — train every muscle 3× per week' },
  { value: 5, label: '5 Days', splitName: 'Upper / Lower',   desc: 'Upper A · Lower A · Upper B · Lower B · Upper C' },
  { value: 6, label: '6 Days', splitName: 'Push / Pull / Legs', desc: 'PPL × 2 — Push · Pull · Legs repeated twice' },
]

const GOALS: { value: WizardGoalType; label: string; desc: string }[] = [
  { value: 'bulk',   label: 'Bulk',   desc: 'Build muscle mass with higher volume' },
  { value: 'cut',    label: 'Cut',    desc: 'Lose fat while preserving muscle' },
  { value: 'recomp', label: 'Recomp', desc: 'Balanced muscle gain and fat loss' },
]

const EMPHASIS_OPTIONS: { value: WizardEmphasis; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'arms',     label: 'Arms' },
  { value: 'chest',    label: 'Chest' },
  { value: 'back',     label: 'Back' },
  { value: 'legs',     label: 'Legs' },
]

const LEVELS: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: 'beginner',     label: 'Beginner',     desc: '< 1 year · 3 sets · 8–12 reps · 90s rest' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years · 4 sets · 8–10 reps · 75s rest' },
  { value: 'advanced',     label: 'Advanced',     desc: '3+ years · 5 sets · 5–8 reps · 90s rest (heavy)' },
]

const EQUIPMENT_OPTIONS: { value: EquipmentType; label: string }[] = [
  { value: 'barbell',    label: 'Barbell' },
  { value: 'dumbbell',   label: 'Dumbbell' },
  { value: 'machine',    label: 'Machine' },
  { value: 'cable',      label: 'Cable' },
  { value: 'bodyweight', label: 'Bodyweight' },
]

// ─── Generic option card ──────────────────────────────────────────────────────

function OptionCard<T extends string | number>({
  value, label, desc, selected, onSelect,
}: { value: T; label: string; desc?: string; selected: boolean; onSelect: (v: T) => void }) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`w-full text-left p-3 rounded-[4px] border transition-colors ${
        selected ? 'border-[#93032E] bg-[#93032E]/10' : 'border-[#2C2C2E] bg-[#1C1C1E]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[15px] font-semibold ${selected ? 'text-[#93032E]' : 'text-white'}`}>
          {label}
        </span>
        {selected && <Check size={14} strokeWidth={2} className="text-[#93032E]" />}
      </div>
      {desc && <p className="text-[13px] text-[#A1A1A6] mt-0.5">{desc}</p>}
    </button>
  )
}

// ─── Next button ──────────────────────────────────────────────────────────────

function NextBtn({ onClick, disabled, label = 'Next' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] mt-2 disabled:opacity-60"
    >
      {label}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgramGeneratorPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('days')
  const [trainingDays, setTrainingDays] = useState<TrainingDays>(5)
  const [goal, setGoal] = useState<WizardGoalType>('recomp')
  const [emphasis, setEmphasis] = useState<WizardEmphasis>('balanced')
  const [level, setLevel] = useState<ExperienceLevel>('intermediate')
  const [equipment, setEquipment] = useState<EquipmentType[]>(['barbell', 'dumbbell', 'machine'])
  const [saving, setSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<number[] | null>(null)

  const stepIndex = STEPS.indexOf(step)

  const inputs: ProgramInputs = { goalType: goal, emphasis, experienceLevel: level, availableEquipment: equipment, trainingDays }
  const preview = step === 'preview' ? generateIndividualisedPlan(inputs) : null

  function toggleEquipment(eq: EquipmentType) {
    setEquipment(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq])
  }

  function next(to: Step) { setStep(to) }

  async function handleSave() {
    if (!preview) return
    setSaving(true)
    try {
      const ids = await saveGeneratedPlan(preview)
      setSavedIds(ids)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#151515] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#151515]/90 backdrop-blur-md border-b border-[#2C2C2E] flex items-center px-3 h-14 gap-3">
        <button
          onClick={() => stepIndex > 0 ? setStep(STEPS[stepIndex - 1]) : navigate(-1)}
          className="p-2 -ml-2 text-white"
        >
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[18px] font-semibold text-white flex-1">Generate Plan</h1>
        <span className="text-[13px] text-[#A1A1A6]">{stepIndex + 1}/{STEPS.length}</span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-[#2C2C2E]">
        <div
          className="h-full bg-[#93032E] transition-all"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <main className="px-4 pt-5 max-w-2xl mx-auto flex flex-col gap-4">

        {/* ── Step: Training Days ── */}
        {step === 'days' && (
          <>
            <h2 className="text-[22px] font-semibold text-white">How many days per week?</h2>
            <p className="text-[14px] text-[#A1A1A6] -mt-2">This determines your split structure.</p>
            {DAYS_OPTIONS.map(o => (
              <OptionCard
                key={o.value}
                value={o.value}
                label={`${o.label} — ${o.splitName}`}
                desc={o.desc}
                selected={trainingDays === o.value}
                onSelect={setTrainingDays}
              />
            ))}
            <NextBtn onClick={() => next('goal')} />
          </>
        )}

        {/* ── Step: Goal ── */}
        {step === 'goal' && (
          <>
            <h2 className="text-[22px] font-semibold text-white">What's your primary goal?</h2>
            {GOALS.map(o => (
              <OptionCard key={o.value} value={o.value} label={o.label} desc={o.desc}
                selected={goal === o.value} onSelect={setGoal} />
            ))}
            <NextBtn onClick={() => next('emphasis')} />
          </>
        )}

        {/* ── Step: Emphasis ── */}
        {step === 'emphasis' && (
          <>
            <h2 className="text-[22px] font-semibold text-white">Muscle emphasis?</h2>
            {EMPHASIS_OPTIONS.map(o => (
              <OptionCard key={o.value} value={o.value} label={o.label}
                selected={emphasis === o.value} onSelect={setEmphasis} />
            ))}
            <NextBtn onClick={() => next('level')} />
          </>
        )}

        {/* ── Step: Experience ── */}
        {step === 'level' && (
          <>
            <h2 className="text-[22px] font-semibold text-white">Training experience?</h2>
            {LEVELS.map(o => (
              <OptionCard key={o.value} value={o.value} label={o.label} desc={o.desc}
                selected={level === o.value} onSelect={setLevel} />
            ))}
            <NextBtn onClick={() => next('equipment')} />
          </>
        )}

        {/* ── Step: Equipment ── */}
        {step === 'equipment' && (
          <>
            <h2 className="text-[22px] font-semibold text-white">Available equipment?</h2>
            <p className="text-[14px] text-[#A1A1A6]">Select everything available at your gym.</p>
            <div className="flex flex-col gap-2">
              {EQUIPMENT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => toggleEquipment(o.value)}
                  className={`w-full text-left p-3 rounded-[4px] border flex items-center justify-between transition-colors ${
                    equipment.includes(o.value) ? 'border-[#93032E] bg-[#93032E]/10' : 'border-[#2C2C2E] bg-[#1C1C1E]'
                  }`}
                >
                  <span className={`text-[15px] font-semibold ${equipment.includes(o.value) ? 'text-[#93032E]' : 'text-white'}`}>
                    {o.label}
                  </span>
                  {equipment.includes(o.value) && <Check size={14} strokeWidth={2} className="text-[#93032E]" />}
                </button>
              ))}
            </div>
            <NextBtn onClick={() => next('preview')} disabled={equipment.length === 0} label="Preview Plan" />
          </>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && preview && (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-white">{preview.title}</h2>
                <span className="text-[11px] text-[#A1A1A6] bg-[#2C2C2E] px-2 py-0.5 rounded-[2px]">
                  {preview.experienceLevel}
                </span>
              </div>
              <p className="text-[13px] text-[#A1A1A6]">{preview.splitName} · {preview.trainingDays} days/week</p>
            </div>

            {/* Sessions — each in a separate card with label */}
            {preview.sessions.map((session, si) => (
              <div key={si} className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] overflow-hidden">
                <div className="px-3 py-2 border-b border-[#2C2C2E] flex items-center justify-between bg-[#2C2C2E]/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-white">{session.label}</span>
                    <span className="text-[11px] text-[#93032E] font-semibold uppercase tracking-wide">{session.focusLabel}</span>
                  </div>
                  <span className="text-[11px] text-[#A1A1A6]">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][session.dayOfWeek]}
                  </span>
                </div>
                {session.exercises.map((ex, ei) => (
                  <div key={ei} className={`flex items-center justify-between px-3 py-2 ${ei > 0 ? 'border-t border-[#2C2C2E]' : ''}`}>
                    <div className="flex flex-col gap-0.5 flex-1 mr-2">
                      <span className="text-[14px] text-white">{ex.name}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-[#A1A1A6]">{ex.primaryMuscle}</span>
                        {ex.priorityLevel === 'primary' && (
                          <span className="text-[10px] text-[#93032E] font-semibold">PRIMARY</span>
                        )}
                        {ex.notes && (
                          <span className="text-[10px] text-[#FF9F0A]">{ex.notes}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[13px] font-medium text-[#A1A1A6]">{ex.sets}×{ex.repMin}–{ex.repMax}</span>
                      <br />
                      <span className="text-[11px] text-[#A1A1A6]">{ex.restSeconds}s rest</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {savedIds ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 p-4">
                  <Check size={20} strokeWidth={2} className="text-[#30D158]" />
                  <span className="text-[17px] font-semibold text-white">
                    {savedIds.length} plan{savedIds.length > 1 ? 's' : ''} saved!
                  </span>
                </div>
                <p className="text-[13px] text-[#A1A1A6] text-center -mt-2">
                  Each session has been saved as a separate plan.
                </p>
                <button onClick={() => navigate('/plans')}
                  className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] flex items-center justify-center gap-2">
                  View All Plans <ChevronRight size={16} strokeWidth={2} />
                </button>
                <button onClick={() => setStep('days')}
                  className="w-full h-10 text-[#A1A1A6] font-medium text-[14px]">
                  Generate Another
                </button>
              </div>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] disabled:opacity-60">
                  {saving ? 'Saving…' : `Save ${preview.sessions.length} Plans`}
                </button>
                <button onClick={() => setStep('days')}
                  className="w-full h-10 text-[#A1A1A6] font-medium text-[14px]">
                  Start Over
                </button>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
