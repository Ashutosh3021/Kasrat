import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  getDayEvaluation,
  getPendingDayEvaluations,
  resolveDay,
} from '../services/streakService'
import type { DayEvaluation } from '../utils/streakEvaluation'
import { toLocalDayKey, weekdayFromDayKey } from '../utils/calendarDay'

function formatDayHeading(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

interface DayResolutionSheetProps {
  open: boolean
  onClose: () => void
  /** When set, only resolve this day; otherwise show all pending days */
  initialDate?: string
  onResolved?: () => void
}

export default function DayResolutionSheet({
  open,
  onClose,
  initialDate,
  onResolved,
}: DayResolutionSheetProps) {
  const [pending, setPending] = useState<DayEvaluation[]>([])
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [detail, setDetail] = useState<DayEvaluation | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    async function load() {
      if (initialDate) {
        const ev = await getDayEvaluation(initialDate)
        setPending([ev])
        setActiveDate(initialDate)
        setDetail(ev)
      } else {
        const list = await getPendingDayEvaluations()
        if (list.length > 0) {
          setPending(list)
          setActiveDate(list[0].date)
          setDetail(list[0])
        } else {
          const today = toLocalDayKey()
          const todayEv = await getDayEvaluation(today)
          if (!todayEv.hadSession) {
            setPending([todayEv])
            setActiveDate(today)
            setDetail(todayEv)
          } else {
            setPending([])
            setActiveDate(null)
            setDetail(null)
          }
        }
      }
    }
    load()
  }, [open, initialDate])

  useEffect(() => {
    if (!activeDate || !open) return
    getDayEvaluation(activeDate).then(setDetail)
  }, [activeDate, open])

  if (!open) return null

  async function handleResolve(resolution: 'rest' | 'missed') {
    if (!activeDate) return
    setSaving(true)
    setError('')
    try {
      await resolveDay(activeDate, resolution)
      onResolved?.()
      const remaining = await getPendingDayEvaluations()
      if (remaining.length === 0 || initialDate) {
        onClose()
      } else {
        setPending(remaining)
        setActiveDate(remaining[0].date)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const isSunday = activeDate ? weekdayFromDayKey(activeDate) === 0 : false

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#151515]/80 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-[#1C1C1E] border border-[#2C2C2E] p-4 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        style={{ borderRadius: '4px 4px 0 0' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[22px] font-medium text-white">Review day</h3>
          <button type="button" onClick={onClose} className="p-2 text-[#A1A1A6] hover:text-white">
            <X size={20} />
          </button>
        </div>

        {pending.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pending.map(p => (
              <button
                key={p.date}
                type="button"
                onClick={() => setActiveDate(p.date)}
                className={`shrink-0 px-3 py-1.5 text-[13px] font-medium rounded-[2px] ${
                  activeDate === p.date
                    ? 'bg-[#93032E] text-white'
                    : 'bg-[#2C2C2E] text-[#A1A1A6]'
                }`}
              >
                {p.date.slice(5)}
              </button>
            ))}
          </div>
        )}

        {detail ? (
          <>
            <div>
              <p className="text-[17px] font-semibold text-white">{formatDayHeading(detail.date)}</p>
              {detail.hadSession ? (
                <p className="text-[15px] text-emerald-400 mt-1">Session logged — counted as complete.</p>
              ) : detail.scheduled ? (
                <p className="text-[15px] text-[#A1A1A6] mt-1">
                  {detail.scheduledPlanTitles.length > 0
                    ? `${detail.scheduledPlanTitles.join(', ')} was scheduled · No session`
                    : 'Workout scheduled · No session'}
                </p>
              ) : isSunday ? (
                <p className="text-[15px] text-[#A1A1A6] mt-1">
                  Sunday wasn&apos;t on your schedule — usually counts as rest automatically.
                </p>
              ) : (
                <p className="text-[15px] text-[#A1A1A6] mt-1">
                  No workout scheduled. Mark as rest if you recovered, or missed if you skipped optional work.
                </p>
              )}
            </div>

            {!detail.hadSession && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleResolve('rest')}
                  className="w-full text-left px-3 py-3 border border-[#2C2C2E] hover:border-[#93032E]/50 disabled:opacity-50"
                  style={{ borderRadius: '2px' }}
                >
                  <span className="text-[15px] font-medium text-white">Rest day</span>
                  <p className="text-[13px] text-[#A1A1A6] mt-0.5">I planned to recover — keep my streak</p>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleResolve('missed')}
                  className="w-full text-left px-3 py-3 border border-[#2C2C2E] hover:border-red-500/40 disabled:opacity-50"
                  style={{ borderRadius: '2px' }}
                >
                  <span className="text-[15px] font-medium text-white">Missed workout</span>
                  <p className="text-[13px] text-[#A1A1A6] mt-0.5">I skipped this — break streak from this day</p>
                </button>
              </div>
            )}

            {error && <p className="text-[13px] text-red-400">{error}</p>}
          </>
        ) : (
          <p className="text-[15px] text-[#A1A1A6]">No days need review right now.</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 border border-[#2C2C2E] text-white font-medium text-[15px]"
          style={{ borderRadius: '2px' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
