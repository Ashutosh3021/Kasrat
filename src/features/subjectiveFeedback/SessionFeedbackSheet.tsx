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
          <span className="text-[15px] font-semibold text-ink">{label}</span>
        </div>
        <span className="text-[24px]">{EMOJI_MAP[value]}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-accent-soft"
      />
      <div className="flex justify-between text-[11px] text-muted">
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
    low: 'var(--color-danger)',
    medium: 'var(--color-warning)',
    high: 'var(--color-success)',
  }[recoveryPreview.label]

  return (
    <div className="fixed inset-0 bg-ground/80 z-[70] flex flex-col justify-end">
      <div className="bg-surface w-full max-h-[90dvh] rounded-t-[4px] border-t border-line flex flex-col">
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-line-strong rounded-full" />
        </div>

        <div className="px-4 flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-[20px] font-semibold text-ink">How was the session?</h2>
          <button onClick={onClose} className="p-2 text-muted">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {saved ? (
          <div className="flex-1 flex items-center justify-center pb-10">
            <div className="flex flex-col items-center gap-3">
              <span className="text-[48px]">✅</span>
              <span className="text-[16px] font-semibold text-ink">Feedback saved!</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-5">
            <EmojiSlider
              label="Energy Level"
              icon={<Zap size={16} strokeWidth={1.5} className="text-warning" />}
              value={energy}
              onChange={setEnergy}
            />
            <EmojiSlider
              label="Mood"
              icon={<Smile size={16} strokeWidth={1.5} className="text-info" />}
              value={mood}
              onChange={setMood}
            />
            <EmojiSlider
              label="Soreness"
              icon={<Activity size={16} strokeWidth={1.5} className="text-danger" />}
              value={soreness}
              onChange={setSoreness}
            />

            {/* Recovery score preview */}
            <div
              className="flex items-center justify-between p-3 rounded-2xl border"
              style={{ borderColor: recoveryColor, background: `${recoveryColor}15` }}
            >
              <span className="text-[14px] font-medium text-ink">Recovery Score</span>
              <span className="text-[20px] font-bold" style={{ color: recoveryColor }}>
                {recoveryPreview.score} / 10
              </span>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-muted">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="How did the session feel overall?"
                className="w-full bg-line border border-line rounded-2xl px-3 py-2 text-[15px] text-ink focus:border-accent-hover focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-accent text-ink font-semibold text-[15px] rounded-lg disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Feedback'}
            </button>
            <button
              onClick={onClose}
              className="w-full h-10 text-muted font-medium text-[14px]"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
