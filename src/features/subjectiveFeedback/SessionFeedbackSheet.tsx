/**
 * Feature 11: Subjective Feedback Integration — Post-Workout Sheet
 *
 * A bottom sheet shown after the last set is logged in a session.
 * Allows rating energy, mood, and soreness with emoji sliders.
 *
 * Usage:
 *   <SessionFeedbackSheet onClose={() => setOpen(false)} sessionDate="2026-06-15" />
 */

import { useState } from 'react'
import { X, Zap, Smile, Activity } from 'lucide-react'
import { saveFeedback, computeRecoveryScore } from './subjectiveFeedbackUtils'
import { useAuthStore } from '../../store/authStore'

interface Props {
  sessionDate: string  // YYYY-MM-DD
  onClose: () => void
}

const EMOJI_MAP: Record<number, string> = {
  1: '😫', 2: '😞', 3: '😟', 4: '😕', 5: '😐',
  6: '🙂', 7: '😊', 8: '😄', 9: '💪', 10: '🔥',
}

function EmojiSlider({
  label,
  icon,
  value,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[15px] font-semibold text-white">{label}</span>
        </div>
        <span className="text-[22px]">{EMOJI_MAP[value]}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#93032E]"
      />
      <div className="flex justify-between text-[11px] text-[#A1A1A6]">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )
}

export default function SessionFeedbackSheet({ sessionDate, onClose }: Props) {
  const { user } = useAuthStore()
  const [energy, setEnergy] = useState(7)
  const [mood, setMood] = useState(7)
  const [soreness, setSoreness] = useState(4)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const recoveryPreview = computeRecoveryScore({ energy, mood, soreness, sessionDate, notes, createdAt: '' })

  async function handleSave() {
    setSaving(true)
    try {
      await saveFeedback({ sessionDate, energy, mood, soreness, notes }, user?.id)
      setSaved(true)
      setTimeout(onClose, 1200)
    } finally {
      setSaving(false)
    }
  }

  const recoveryColor = {
    low: '#FF453A',
    medium: '#FF9F0A',
    high: '#30D158',
  }[recoveryPreview.label]

  return (
    <div className="fixed inset-0 bg-[#151515]/80 z-[70] flex flex-col justify-end">
      <div className="bg-[#1C1C1E] w-full max-h-[90dvh] rounded-t-[4px] border-t border-[#2C2C2E] flex flex-col">
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-[#353437] rounded-full" />
        </div>

        <div className="px-4 flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-[20px] font-semibold text-white">How was the session?</h2>
          <button onClick={onClose} className="p-2 text-[#A1A1A6]">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {saved ? (
          <div className="flex-1 flex items-center justify-center pb-10">
            <div className="flex flex-col items-center gap-3">
              <span className="text-[48px]">✅</span>
              <span className="text-[17px] font-semibold text-white">Feedback saved!</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-5">
            <EmojiSlider
              label="Energy Level"
              icon={<Zap size={16} strokeWidth={1.5} className="text-[#FF9F0A]" />}
              value={energy}
              onChange={setEnergy}
            />
            <EmojiSlider
              label="Mood"
              icon={<Smile size={16} strokeWidth={1.5} className="text-[#0A84FF]" />}
              value={mood}
              onChange={setMood}
            />
            <EmojiSlider
              label="Soreness"
              icon={<Activity size={16} strokeWidth={1.5} className="text-[#FF453A]" />}
              value={soreness}
              onChange={setSoreness}
            />

            {/* Recovery score preview */}
            <div
              className="flex items-center justify-between p-3 rounded-[4px] border"
              style={{ borderColor: recoveryColor, background: `${recoveryColor}15` }}
            >
              <span className="text-[14px] font-medium text-white">Recovery Score</span>
              <span className="text-[20px] font-bold" style={{ color: recoveryColor }}>
                {recoveryPreview.score} / 10
              </span>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-[#A1A1A6]">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="How did the session feel overall?"
                className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[15px] text-white focus:border-[#93032E] focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Feedback'}
            </button>
            <button
              onClick={onClose}
              className="w-full h-10 text-[#A1A1A6] font-medium text-[14px]"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
