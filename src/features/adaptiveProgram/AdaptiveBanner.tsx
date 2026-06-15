/**
 * Feature 2: Adaptive Program Adjustments — UI Banner
 *
 * Renders a dismissible recommendation card. Drop this component into
 * any page where you want adaptive feedback (e.g. StartPlanPage header).
 */

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import {
  getAdjustmentRecommendation,
  type AdjustmentRecommendation,
} from './adaptiveEngine'
import { db } from '../../db/database'

export default function AdaptiveBanner() {
  const [rec, setRec] = useState<AdjustmentRecommendation | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const totalSessions = await db.gym_sets
        .filter(s => !s.isWarmup && !s.hidden)
        .count()
      // Assume 3 days/week as default schedule; could be wired to plan config
      const scheduledDays = 3
      const result = await getAdjustmentRecommendation(scheduledDays, totalSessions)
      if (!cancelled && result.type !== 'none') setRec(result)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (!rec || dismissed) return null

  const icons = {
    increase_load: <TrendingUp size={16} strokeWidth={1.5} className="text-[#30D158]" />,
    decrease_volume: <TrendingDown size={16} strokeWidth={1.5} className="text-[#FF9F0A]" />,
    deload: <Minus size={16} strokeWidth={1.5} className="text-[#0A84FF]" />,
    none: null,
  }

  const borderColor = {
    increase_load: '#30D158',
    decrease_volume: '#FF9F0A',
    deload: '#0A84FF',
    none: '#2C2C2E',
  }[rec.type]

  return (
    <div
      className="flex items-start justify-between gap-3 p-3 rounded-[4px] border bg-[#1C1C1E]"
      style={{ borderColor }}
    >
      <div className="flex items-start gap-2 flex-1">
        <div className="mt-0.5 shrink-0">{icons[rec.type]}</div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-white">Adaptive Suggestion</span>
          <span className="text-[13px] text-[#A1A1A6]">{rec.reason}</span>
          {rec.loadDelta !== 0 && (
            <span className="text-[11px] text-[#A1A1A6]">
              Load change: {rec.loadDelta > 0 ? '+' : ''}
              {Math.round(rec.loadDelta * 100)}%
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 text-[#A1A1A6] hover:text-white transition-colors"
        aria-label="Dismiss suggestion"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}
