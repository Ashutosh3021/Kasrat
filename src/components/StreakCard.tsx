import { useState } from 'react'
import { Flame } from 'lucide-react'
import { monthLabelFromDayKey } from '../utils/calendarDay'
import { useStreakStore } from '../store/streakStore'
import DayResolutionSheet from './DayResolutionSheet'
import { refreshStreak } from '../services/streakService'

export default function StreakCard() {
  const {
    currentStreak,
    previousStreak,
    longestStreak,
    sessionsThisMonth,
    totalSessions,
    pendingCount,
    activeToday,
  } = useStreakStore()

  const [sheetOpen, setSheetOpen] = useState(false)

  const monthLabel = monthLabelFromDayKey()
  const best = Math.max(longestStreak, currentStreak)

  let statusChip: { text: string; className: string }
  if (pendingCount > 0) {
    statusChip = {
      text: `${pendingCount} day${pendingCount === 1 ? '' : 's'} need review`,
      className: 'chip chip-warning',
    }
  } else if (activeToday) {
    statusChip = { text: 'Active today', className: 'chip chip-success' }
  } else if (currentStreak > 0) {
    statusChip = { text: 'Log today to extend', className: 'chip chip-accent' }
  } else {
    statusChip = { text: 'Log a session to start', className: 'chip' }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="card card-hover w-full p-5 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="kicker">Activity streak</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${currentStreak > 0 ? 'bg-accent-soft' : 'bg-muted-dim'}`}
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="display text-[50px] leading-none text-ink">{currentStreak}</span>
              <span className="text-[13px] font-semibold text-muted">
                {currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <span className={`${statusChip.className} mt-3`}>{statusChip.text}</span>
          </div>

          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              currentStreak > 0
                ? 'border-accent/35 bg-accent/10 text-accent-soft'
                : 'border-line bg-surface-high text-muted'
            }`}
          >
            <Flame size={22} strokeWidth={1.8} />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
          <div className="pr-3">
            <span className="stat-label block">{monthLabel}</span>
            <span className="mt-1.5 block text-[17px] font-bold tracking-[-0.03em] text-ink">
              {sessionsThisMonth}
            </span>
          </div>
          <div className="px-3">
            <span className="stat-label block">Best</span>
            <span className="mt-1.5 block text-[17px] font-bold tracking-[-0.03em] text-ink">
              {best}
            </span>
          </div>
          <div className="pl-3">
            <span className="stat-label block">All time</span>
            <span className="mt-1.5 block text-[17px] font-bold tracking-[-0.03em] text-ink">
              {totalSessions.toLocaleString()}
            </span>
          </div>
        </div>

        {previousStreak > 0 && currentStreak === 0 && (
          <p className="mt-3 text-[12px] text-muted">
            Previous streak: {previousStreak} {previousStreak === 1 ? 'day' : 'days'}
          </p>
        )}
      </button>

      <DayResolutionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onResolved={() => void refreshStreak()}
      />
    </>
  )
}
