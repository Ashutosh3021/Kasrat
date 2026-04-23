const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6]

interface DayPillsProps {
  activeDays: number[]
  onToggle?: (day: number) => void
  readonly?: boolean
}

export default function DayPills({ activeDays, onToggle, readonly }: DayPillsProps) {
  return (
    <div className="flex items-center gap-2">
      {DAY_INDICES.map((d, i) => {
        const active = activeDays.includes(d)
        return (
          <button
            key={d}
            onClick={() => !readonly && onToggle?.(d)}
            disabled={readonly}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
              active
                ? 'bg-[#adc6ff] text-[#002e6a] shadow-[0_0_8px_rgba(173,198,255,0.3)]'
                : 'border border-[#424754] text-[#424754]'
            }`}
          >
            {DAYS[i]}
          </button>
        )
      })}
    </div>
  )
}
