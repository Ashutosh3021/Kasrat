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
    <div className="fixed inset-0 bg-[#151515]/80 z-[80] flex flex-col justify-end">
      <div className="bg-[#1C1C1E] w-full max-h-[85dvh] rounded-t-[4px] border-t border-[#2C2C2E] flex flex-col">
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-[#353437] rounded-full" />
        </div>

        <div className="px-4 flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Calculator size={18} strokeWidth={1.5} className="text-[#93032E]" />
            <h2 className="text-[20px] font-semibold text-white">Estimation Calculator</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[#A1A1A6]">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-[#A1A1A6]">Weight</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-2 py-2 text-[15px] text-white focus:border-[#93032E] focus:outline-none pr-8"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#A1A1A6]">kg</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-[#A1A1A6]">Reps</label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={e => setReps(e.target.value)}
                placeholder="0"
                className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-2 py-2 text-[15px] text-white focus:border-[#93032E] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-[#A1A1A6]">RPE (opt.)</label>
              <input
                type="number"
                inputMode="decimal"
                value={rpe}
                onChange={e => setRpe(e.target.value)}
                placeholder="1–10"
                min="1"
                max="10"
                className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-2 py-2 text-[15px] text-white focus:border-[#93032E] focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full h-11 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px]"
          >
            Calculate
          </button>

          {result && (
            <div className="flex flex-col gap-3">
              {/* Estimated 1RM */}
              <div className="bg-[#2C2C2E]/40 border border-[#2C2C2E] rounded-[4px] p-3">
                <p className="text-[13px] text-[#A1A1A6]">Estimated 1 Rep Max</p>
                <p className="text-[32px] font-semibold text-white mt-1">
                  {result.estimated1RM} <span className="text-[17px] font-normal text-[#A1A1A6]">kg</span>
                </p>
                {onApply && (
                  <button
                    onClick={() => onApply(result.estimated1RM)}
                    className="mt-2 text-[13px] text-[#93032E] font-semibold"
                  >
                    Apply to set
                  </button>
                )}
              </div>

              {/* Rep range suggestions */}
              <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] overflow-hidden">
                <div className="px-3 py-2 border-b border-[#2C2C2E]">
                  <span className="text-[13px] font-medium text-[#A1A1A6]">Load Suggestions</span>
                </div>
                {[
                  { label: '6–8 reps (Strength)', load: result.load68 },
                  { label: '8–10 reps (Hypertrophy)', load: result.load810 },
                  { label: '10–12 reps (Volume)', load: result.load1012 },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2.5 ${
                      i > 0 ? 'border-t border-[#2C2C2E]' : ''
                    }`}
                  >
                    <span className="text-[14px] text-[#A1A1A6]">{row.label}</span>
                    <span className="text-[15px] font-semibold text-white">{row.load} kg</span>
                  </div>
                ))}
              </div>

              {/* RPE projection */}
              {rpeProjection !== null && (
                <div className="bg-[#2C2C2E]/40 border border-[#2C2C2E] rounded-[4px] p-3">
                  <p className="text-[13px] text-[#A1A1A6]">Projected max reps at this weight</p>
                  <p className="text-[26px] font-semibold text-white mt-1">
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
