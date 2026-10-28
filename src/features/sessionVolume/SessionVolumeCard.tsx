/**
 * Feature 15: Track Volume of Each Session Individually
 *
 * Displays a per-routine session volume card with comparison to the
 * previous session of the same routine type.
 *
 * Drop this card into the HistoryPage session list or StartPlanPage
 * completion screen.
 *
 * Usage:
 *   <SessionVolumeCard routineName="Push" sessionDate="2026-06-15" />
 */

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { computeSessionVolumes, type SessionVolumePoint } from '../progressVisualization/volumeUtils'

interface Props {
  routineName: string
  sessionDate: string   // YYYY-MM-DD
}

export default function SessionVolumeCard({ routineName, sessionDate }: Props) {
  const [current, setCurrent] = useState<SessionVolumePoint | null>(null)
  const [previous, setPrevious] = useState<SessionVolumePoint | null>(null)

  useEffect(() => {
    async function load() {
      const all = await computeSessionVolumes()
      const ofRoutine = all.filter(s => s.routineName === routineName)

      const curr = ofRoutine.find(s => s.date === sessionDate) ?? null
      const prev = ofRoutine.filter(s => s.date < sessionDate).pop() ?? null

      setCurrent(curr)
      setPrevious(prev)
    }
    load()
  }, [routineName, sessionDate])

  if (!current) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-3">
        <p className="text-[13px] text-muted">No volume data for this session yet.</p>
      </div>
    )
  }

  const delta = previous ? current.totalVolume - previous.totalVolume : null
  const deltaPercent =
    previous && previous.totalVolume > 0
      ? Math.round(((delta ?? 0) / previous.totalVolume) * 100)
      : null

  const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown
  const deltaColor = delta === null || delta === 0 ? 'var(--color-muted)' : delta > 0 ? 'var(--color-success)' : 'var(--color-danger)'

  return (
    <div className="bg-surface border border-line rounded-2xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-ink">{routineName}</span>
        <span className="text-[11px] text-muted">{sessionDate}</span>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-[28px] font-semibold text-ink leading-none">
          {Math.round(current.totalVolume).toLocaleString()}
        </span>
        <span className="text-[13px] text-muted mb-0.5">kg lifted · {current.setCount} sets</span>
      </div>

      {delta !== null && (
        <div className="flex items-center gap-1.5">
          <DeltaIcon size={14} strokeWidth={1.5} style={{ color: deltaColor }} />
          <span className="text-[13px] font-medium" style={{ color: deltaColor }}>
            {delta > 0 ? '+' : ''}{Math.round(delta).toLocaleString()} kg
            {deltaPercent !== null && ` (${deltaPercent > 0 ? '+' : ''}${deltaPercent}%)`}
          </span>
          <span className="text-[11px] text-muted">vs last {routineName}</span>
        </div>
      )}

      {!previous && (
        <p className="text-[13px] text-muted">First {routineName} session logged!</p>
      )}
    </div>
  )
}
