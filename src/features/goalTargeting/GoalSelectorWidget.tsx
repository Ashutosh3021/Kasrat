/**
 * Feature 1: Goal-Specific Targeting — UI Widget
 *
 * A self-contained selector that can be dropped into the Settings page
 * or the Onboarding wizard. Reads/writes via useGoalTargetingStore.
 */

import { useEffect } from 'react'
import { Target } from 'lucide-react'
import { useGoalTargetingStore, type GoalType } from './goalTargetingStore'
import { useAuthStore } from '../../store/authStore'

const GOAL_OPTIONS: { value: GoalType; label: string; desc: string }[] = [
  {
    value: 'bulk',
    label: 'Bulk',
    desc: '+15% volume · compound lifts priority · RPE ≤ 7.5',
  },
  {
    value: 'cut',
    label: 'Cut',
    desc: '-15% volume · circuit style · RPE ≤ 8.5',
  },
  {
    value: 'maintain',
    label: 'Maintain',
    desc: 'Neutral volume · balanced exercise mix · RPE ≤ 8.0',
  },
]

interface GoalSelectorWidgetProps {
  /** Compact mode renders inline chips instead of cards */
  compact?: boolean
}

export default function GoalSelectorWidget({ compact = false }: GoalSelectorWidgetProps) {
  const { user } = useAuthStore()
  const { goal, loaded, loadGoal, setGoal } = useGoalTargetingStore()

  useEffect(() => {
    if (user && !loaded) loadGoal(user.id)
  }, [user, loaded, loadGoal])

  if (!loaded) return null

  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        {GOAL_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => user && setGoal(user.id, o.value)}
            className={`px-3 py-1.5 text-[13px] font-semibold rounded-[2px] transition-colors border ${
              goal === o.value
                ? 'bg-[#93032E]/20 border-[#93032E] text-[#93032E]'
                : 'border-[#2C2C2E] text-[#A1A1A6] bg-[#1C1C1E]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Target size={16} strokeWidth={1.5} className="text-[#93032E]" />
        <h3 className="text-[17px] font-semibold text-white">Training Goal</h3>
      </div>

      <div className="flex flex-col gap-2">
        {GOAL_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => user && setGoal(user.id, o.value)}
            className={`w-full text-left p-3 border rounded-[4px] transition-colors ${
              goal === o.value
                ? 'border-[#93032E] bg-[#93032E]/10'
                : 'border-[#2C2C2E] bg-[#1C1C1E] hover:border-[#93032E]/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[15px] font-semibold ${
                  goal === o.value ? 'text-[#93032E]' : 'text-white'
                }`}
              >
                {o.label}
              </span>
              {goal === o.value && (
                <span className="text-[11px] font-medium text-[#93032E] bg-[#93032E]/20 px-2 py-0.5 rounded-[2px]">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#A1A1A6] mt-0.5">{o.desc}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
