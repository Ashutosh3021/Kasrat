import { useState } from 'react'
import { ChevronRight, Flame } from 'lucide-react'
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

  let statusChip: { text: string; className: string }
  if (pendingCount > 0) {
    statusChip = {
      text: `${pendingCount} day${pendingCount === 1 ? '' : 's'} need review`,
      className: 'text-amber-400',
    }
  } else if (activeToday) {
    statusChip = { text: 'Active today', className: 'text-emerald-400' }
  } else if (currentStreak > 0) {
    statusChip = { text: 'Log today to extend', className: 'text-[#A1A1A6]' }
  } else {
    statusChip = { text: 'Log a session to start', className: 'text-[#A1A1A6]' }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="w-full bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col gap-3 text-left hover:border-[#93032E]/40 transition-colors"
        style={{ borderRadius: '4px' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                currentStreak > 0 ? 'bg-[#93032E]/20' : 'bg-[#2C2C2E]'
              }`}
              style={{ borderRadius: '4px' }}
            >
              <Flame
                size={22}
                className={currentStreak > 0 ? 'text-[#93032E]' : 'text-[#A1A1A6]'}
                strokeWidth={1.5}
              />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13px] font-medium text-[#A1A1A6]">Activity streak</span>
              <span className="text-[32px] font-semibold text-white leading-none">
                {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
              </span>
              {previousStreak > 0 && (
                <span className="text-[13px] text-[#A1A1A6]">
                  Last streak: {previousStreak} {previousStreak === 1 ? 'day' : 'days'}
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={18} className="text-[#424754] shrink-0 mt-2" />
        </div>

        <div className="border-t border-[#2C2C2E] pt-3 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-white">
              {monthLabel}: {sessionsThisMonth} session{sessionsThisMonth === 1 ? '' : 's'}
            </span>
            <span className={`text-[11px] font-medium uppercase tracking-wide ${statusChip.className}`}>
              {statusChip.text}
            </span>
          </div>
          <span className="text-[13px] text-[#A1A1A6]">
            Total sessions: {totalSessions.toLocaleString()}
          </span>
          {longestStreak > 0 && currentStreak < longestStreak && (
            <span className="text-[13px] text-[#A1A1A6]">
              Personal best: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>
      </button>

      <DayResolutionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onResolved={() => void refreshStreak()}
      />
    </>
  )
}
