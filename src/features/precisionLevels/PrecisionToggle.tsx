/**
 * Feature 14: Training-Specific Precision Levels — Toggle Component
 *
 * A compact 3-way toggle for the workout toolbar.
 * Drop into StartPlanPage or QuickWorkoutPage header without modifying them.
 *
 * Usage:
 *   <PrecisionToggle />
 */

import { usePrecisionStore, type PrecisionMode } from './precisionStore'

const MODES: { value: PrecisionMode; label: string; tooltip: string }[] = [
  { value: 'minimal', label: 'Min', tooltip: 'Log primary lifts only' },
  { value: 'standard', label: 'Std', tooltip: 'Primary + secondary exercises' },
  { value: 'full', label: 'Full', tooltip: 'Log everything including warmups' },
]

export default function PrecisionToggle() {
  const { mode, setMode } = usePrecisionStore()

  return (
    <div
      className="flex items-center gap-0.5 bg-line rounded-2xl p-0.5"
      title="Logging precision"
    >
      {MODES.map(m => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          title={m.tooltip}
          aria-label={m.tooltip}
          className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors ${
            mode === m.value
              ? 'bg-accent text-ink'
              : 'text-muted hover:text-ink'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
