/**
 * Feature 7: Manual Entry Features — Add Custom Exercise Sheet
 *
 * A bottom sheet that allows users to create a custom exercise and
 * immediately add it to their current workout. Integrates with
 * addCustomExercise() without touching any existing AddExercisePage code.
 */

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { addCustomExercise } from './customExerciseUtils'
import { useAuthStore } from '../../store/authStore'
import { MUSCLE_GROUPS, type MuscleGroup } from '../../data/exercisePresets'

interface Props {
  onClose: () => void
  /** Called after a successful exercise creation so caller can add it to workout */
  onCreated: (exerciseName: string) => void
}

export default function AddCustomExerciseSheet({ onClose, onCreated }: Props) {
  const { user } = useAuthStore()
  const [name, setName] = useState('')
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('Chest')
  const [secondaryMuscle, setSecondaryMuscle] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Exercise name is required')
      return
    }
    setSaving(true)
    setError('')

    try {
      const result = await addCustomExercise(
        {
          name: trimmed,
          primaryMuscle,
          secondaryMuscle: secondaryMuscle.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        user?.id,
      )

      if (result === 'duplicate_warning') {
        setError(`"${trimmed}" already exists in your exercise library.`)
        setSaving(false)
        return
      }

      onCreated(trimmed)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to save exercise')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#151515]/80 z-[75] flex flex-col justify-end">
      <div className="bg-[#1C1C1E] w-full max-h-[90dvh] rounded-t-[4px] border-t border-[#2C2C2E] flex flex-col">
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-[#353437] rounded-full" />
        </div>
        <div className="px-4 flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-[20px] font-semibold text-white">Custom Exercise</h2>
          <button onClick={onClose} className="p-2 text-[#A1A1A6]">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#A1A1A6]">Exercise Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Single-arm cable row"
              className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#93032E] focus:outline-none"
            />
          </div>

          {/* Primary Muscle */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#A1A1A6]">Primary Muscle *</label>
            <select
              value={primaryMuscle}
              onChange={e => setPrimaryMuscle(e.target.value as MuscleGroup)}
              className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#93032E] focus:outline-none"
            >
              {MUSCLE_GROUPS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Secondary Muscle (optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#A1A1A6]">Secondary Muscle (optional)</label>
            <input
              type="text"
              value={secondaryMuscle}
              onChange={e => setSecondaryMuscle(e.target.value)}
              placeholder="e.g. Biceps"
              className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#93032E] focus:outline-none"
            />
          </div>

          {/* Coaching Cues */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#A1A1A6]">Notes / Cues (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Technique cues or notes…"
              className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#93032E] focus:outline-none resize-none"
            />
          </div>

          {error && <span className="text-[13px] text-[#FF453A]">{error}</span>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Plus size={16} strokeWidth={2} />
            {saving ? 'Saving…' : 'Create & Add Exercise'}
          </button>
        </div>
      </div>
    </div>
  )
}
