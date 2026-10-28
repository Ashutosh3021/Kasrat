const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6]

interface DayPillsProps {
  activeDays: number[]
  onToggle?: (day: number) => void
  readonly?: boolean
}

export default function DayPills({ activeDays, onToggle, readonly }: DayPillsProps) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Training days">
      {DAY_INDICES.map((d, i) => {
        const active = activeDays.includes(d)
        return (
          <button
            key={d}
            type="button"
            onClick={() => !readonly && onToggle?.(d)}
            disabled={readonly}
            aria-label={DAY_NAMES[i]}
            aria-pressed={active}
            className={`flex h-8 w-8 items-center justify-center rounded-[10px] border text-[11px] font-semibold transition-all ${
              active
                ? 'border-accent bg-accent text-on-accent shadow-[0_6px_14px_-10px_rgba(198,58,25,0.9)]'
                : 'border-line bg-surface-raised text-muted hover:border-line-strong hover:text-ink'
            } disabled:cursor-default`}
          >
            {DAYS[i]}
          </button>
        )
      })}
    </div>
  )
}
