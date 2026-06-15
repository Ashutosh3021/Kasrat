/**
 * Feature 3: Comprehensive Weight Monitoring — Daily Entry Widget
 *
 * Shows a compact "log today's weight" card. Reads/writes to the
 * existing `body_measurements` Dexie table via writeSync helpers.
 * Drop into HomePage above or below StreakCard.
 */

import { useEffect, useState } from 'react'
import { Scale, Check, AlertTriangle } from 'lucide-react'
import { db } from '../../db/database'
import { addBodyMeasurement, updateBodyMeasurement } from '../../supabase/writeSync'

const MIN_WEIGHT_KG = 30
const MAX_WEIGHT_KG = 300

/** Returns true when a value deviates more than 3 kg from a recent mean */
function isOutlier(newWeight: number, recent: number[]): boolean {
  if (recent.length === 0) return false
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length
  return Math.abs(newWeight - mean) > 3
}

export default function WeightEntryWidget() {
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [existingId, setExistingId] = useState<number | undefined>()
  const [warnOutlier, setWarnOutlier] = useState(false)
  const [pendingWeight, setPendingWeight] = useState<number | null>(null)
  const [error, setError] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    async function checkToday() {
      // Check if weight already logged today
      const all = await db.body_measurements.orderBy('created').toArray()
      const todayEntry = all.find(m => m.created.slice(0, 10) === today)
      if (todayEntry) {
        setInput(todayEntry.bodyWeight != null ? String(todayEntry.bodyWeight) : '')
        setExistingId(todayEntry.id)
        setSaved(true)
      }
    }
    checkToday()
  }, [today])

  async function handleSave(weight: number) {
    const created = `${today}T07:00:00.000Z`
    if (existingId) {
      await updateBodyMeasurement(existingId, { created, bodyWeight: weight })
    } else {
      await addBodyMeasurement({ created, bodyWeight: weight })
      const all = await db.body_measurements.orderBy('created').toArray()
      const fresh = all.find(m => m.created.slice(0, 10) === today)
      if (fresh) setExistingId(fresh.id)
    }
    setSaved(true)
    setWarnOutlier(false)
    setPendingWeight(null)
  }

  async function handleSubmit() {
    const w = parseFloat(input)
    if (isNaN(w) || w < MIN_WEIGHT_KG || w > MAX_WEIGHT_KG) {
      setError(`Enter a weight between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg`)
      return
    }
    setError('')

    // Outlier check — compare against last 7 days of weights
    const recent = await db.body_measurements
      .orderBy('created')
      .reverse()
      .limit(7)
      .toArray()
    const recentWeights = recent
      .filter(m => m.bodyWeight != null)
      .map(m => m.bodyWeight as number)

    if (isOutlier(w, recentWeights)) {
      setPendingWeight(w)
      setWarnOutlier(true)
      return
    }

    await handleSave(w)
  }

  if (saved && !warnOutlier) {
    return (
      <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 rounded-[4px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale size={16} strokeWidth={1.5} className="text-[#93032E]" />
          <span className="text-[15px] font-medium text-white">Today's Weight</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-white">{input} kg</span>
          <Check size={14} strokeWidth={2} className="text-[#30D158]" />
          <button
            onClick={() => setSaved(false)}
            className="text-[13px] text-[#93032E] font-medium ml-1"
          >
            Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 rounded-[4px] flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Scale size={16} strokeWidth={1.5} className="text-[#93032E]" />
        <span className="text-[15px] font-semibold text-white">Log Today's Weight</span>
      </div>

      {/* Outlier warning */}
      {warnOutlier && pendingWeight !== null && (
        <div className="flex items-start gap-2 p-2 bg-[#FF9F0A]/10 border border-[#FF9F0A]/40 rounded-[4px]">
          <AlertTriangle size={14} strokeWidth={1.5} className="text-[#FF9F0A] mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[13px] text-[#FF9F0A] font-medium">
              {pendingWeight} kg differs by more than 3 kg from your recent trend.
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(pendingWeight)}
                className="text-[13px] text-[#30D158] font-semibold"
              >
                Save anyway
              </button>
              <button
                onClick={() => { setWarnOutlier(false); setPendingWeight(null) }}
                className="text-[13px] text-[#A1A1A6] font-medium"
              >
                Re-enter
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            placeholder="e.g. 82.5"
            className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#93032E] focus:outline-none pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A1A1A6]">kg</span>
        </div>
        <button
          onClick={handleSubmit}
          className="px-4 h-10 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] shrink-0"
        >
          Save
        </button>
      </div>

      {error && (
        <span className="text-[13px] text-[#FF453A]">{error}</span>
      )}
    </div>
  )
}
