/**
 * Feature 6: Estimation Tools — Modal Component
 *
 * A calculator modal for 1RM estimation and rep-range load suggestions.
 * Trigger it from any workout logging screen.
 *
 * Usage:
 *   <EstimationModal onClose={() => setOpen(false)} />
 */

import { useState } from 'react'
import { X, Calculator } from 'lucide-react'
import { computeEstimates, projectRepsFromRPE, type EstimationResult } from './estimationUtils'

interface Props {
  /** Optional pre-fill from a known set */
  initialWeight?: number
  initialReps?: number
  onClose: () => void
  /** Called when user wants to apply the estimated 1RM back to a set */
  onApply?: (estimated1RM: number) => void
}

export default function EstimationModal({ initialWeight, initialReps, onClose, onApply }: Props) {
  const [weight, setWeight] = useState(initialWeight != null ? String(initialWeight) : '')
  const [reps, setReps] = useState(initialReps != null ? String(initialReps) : '')
  const [rpe, setRpe] = useState('')
  const [result, setResult] = useState<EstimationResult | null>(null)
  const [rpeProjection, setRpeProjection] = useState<number | null>(null)

  function handleCalculate() {
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return
    setResult(computeEstimates(w, r))

    const rpeVal = parseFloat(rpe)
    if (!isNaN(rpeVal) && rpeVal > 0 && rpeVal <= 10) {
      setRpeProjection(projectRepsFromRPE(r, rpeVal, 10))
    } else {
      setRpeProjection(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-ground/80 z-[80] flex flex-col justify-end">
      <div className="bg-surface w-full max-h-[85dvh] rounded-t-[4px] border-t border-line flex flex-col">
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-line-strong rounded-full" />
        </div>

        <div className="px-4 flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Calculator size={18} strokeWidth={1.5} className="text-accent-soft" />
            <h2 className="text-[20px] font-semibold text-ink">Estimation Calculator</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-muted">Weight</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="0"
                  className="w-full bg-line border border-line rounded-2xl px-2 py-2 text-[15px] text-ink focus:border-accent-hover focus:outline-none pr-8"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">kg</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-muted">Reps</label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={e => setReps(e.target.value)}
                placeholder="0"
                className="w-full bg-line border border-line rounded-2xl px-2 py-2 text-[15px] text-ink focus:border-accent-hover focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-muted">RPE (opt.)</label>
              <input
                type="number"
                inputMode="decimal"
                value={rpe}
                onChange={e => setRpe(e.target.value)}
                placeholder="1–10"
                min="1"
                max="10"
                className="w-full bg-line border border-line rounded-2xl px-2 py-2 text-[15px] text-ink focus:border-accent-hover focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full h-11 bg-accent text-ink font-semibold text-[15px] rounded-lg"
          >
            Calculate
          </button>

          {result && (
            <div className="flex flex-col gap-3">
              {/* Estimated 1RM */}
              <div className="bg-line/40 border border-line rounded-2xl p-3">
                <p className="text-[13px] text-muted">Estimated 1 Rep Max</p>
                <p className="text-[40px] font-semibold text-ink mt-1">
                  {result.estimated1RM} <span className="text-[16px] font-normal text-muted">kg</span>
                </p>
                {onApply && (
                  <button
                    onClick={() => onApply(result.estimated1RM)}
                    className="mt-2 text-[13px] text-accent-soft font-semibold"
                  >
                    Apply to set
                  </button>
                )}
              </div>

              {/* Rep range suggestions */}
              <div className="bg-surface border border-line rounded-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-line">
                  <span className="text-[13px] font-medium text-muted">Load Suggestions</span>
                </div>
                {[
                  { label: '6–8 reps (Strength)', load: result.load68 },
                  { label: '8–10 reps (Hypertrophy)', load: result.load810 },
                  { label: '10–12 reps (Volume)', load: result.load1012 },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2.5 ${
                      i > 0 ? 'border-t border-line' : ''
                    }`}
                  >
                    <span className="text-[14px] text-muted">{row.label}</span>
                    <span className="text-[15px] font-semibold text-ink">{row.load} kg</span>
                  </div>
                ))}
              </div>

              {/* RPE projection */}
              {rpeProjection !== null && (
                <div className="bg-line/40 border border-line rounded-2xl p-3">
                  <p className="text-[13px] text-muted">Projected max reps at this weight</p>
                  <p className="text-[26px] font-semibold text-ink mt-1">
                    ~{rpeProjection} reps
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
