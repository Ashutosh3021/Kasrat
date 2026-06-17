/**
 * Daily Readiness Assessment — Traffic-Light Recovery System
 *
 * Route: /readiness
 * Users rate 5 metrics (1–5) and get a Green/Yellow/Red recommendation
 * that guides their training intensity for the day.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Moon, Dumbbell, Zap, Brain, Flame, RotateCcw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { db, type ReadinessLabel } from '../db/database'
import { upsertReadinessScore } from '../supabase/writeSync'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  sleep: number
  soreness: number
  energy: number
  stress: number
  motivation: number
}

interface ReadinessResult {
  total: number
  label: ReadinessLabel
  forced: boolean  // true if motivation=1 override applied
}

// ─── Logic ────────────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
}

function calcResult(m: Metrics): ReadinessResult {
  const total = m.sleep + m.soreness + m.energy + m.stress + m.motivation
  // Exception: motivation=1 always → Red
  if (m.motivation === 1) return { total, label: 'red', forced: true }
  if (total >= 20) return { total, label: 'green', forced: false }
  if (total >= 14) return { total, label: 'yellow', forced: false }
  return { total, label: 'red', forced: false }
}

// ─── Label copy ───────────────────────────────────────────────────────────────

const LABEL_META = {
  green:  { emoji: '🟢', text: 'Primed to Perform',              color: '#22c55e' as const },
  yellow: { emoji: '🟡', text: 'Baseline / Accumulating Fatigue', color: '#eab308' as const },
  red:    { emoji: '🔴', text: 'Danger Zone',                     color: '#FF453A' as const },
}

function buildSummary(m: Metrics, result: ReadinessResult): string {
  if (result.forced) {
    return 'Low motivation is a sign of CNS fatigue — your nervous system needs rest.'
  }
  const highs: string[] = []
  const lows: string[] = []
  if (m.sleep >= 4) highs.push('sleep')
  else if (m.sleep <= 2) lows.push('sleep quality')
  if (m.energy >= 4) highs.push('energy')
  else if (m.energy <= 2) lows.push('energy levels')
  if (m.soreness <= 2) highs.push('muscle recovery')
  else if (m.soreness >= 4) lows.push('muscle soreness')
  if (m.stress >= 4) lows.push('high life stress')
  else if (m.stress <= 2) highs.push('low stress')
  if (m.motivation >= 4) highs.push('motivation')
  else if (m.motivation <= 2) lows.push('low motivation')

  const parts: string[] = []
  if (highs.length) parts.push(`Your ${highs.join(' and ')} ${highs.length === 1 ? 'is' : 'are'} solid.`)
  if (lows.length) parts.push(`However, ${lows.join(' and ')} suggest${lows.length === 1 ? 's' : ''} accumulated fatigue.`)
  if (!parts.length) return 'Your scores are moderate across the board. Train with awareness today.'
  return parts.join(' ')
}

function buildCoachNote(m: Metrics, result: ReadinessResult): string {
  if (result.forced) return 'Prioritise sleep tonight and take a complete rest day. CNS fatigue can\'t be trained through.'
  if (m.stress >= 4 && result.label !== 'green') return 'High stress is eating into your recovery. A lighter session today will set you up for a stronger one tomorrow.'
  if (m.sleep <= 2) return 'Poor sleep significantly limits strength and recovery. Reduce intensity and focus on form today.'
  if (m.soreness >= 4) return 'Your muscles are still repairing. Pushing hard now risks overtraining — let recovery do its job.'
  if (m.motivation <= 2 && result.label === 'yellow') return 'Your muscles feel fine, but low motivation suggests your CNS is tired. Prioritise sleep tonight.'
  if (result.label === 'green') return 'Everything checks out. Make this session count — your body is primed to adapt and grow stronger.'
  return 'Monitor how you feel during warm-up. If something feels off, dial back the intensity without guilt.'
}

const ACTION_PLAN: Record<ReadinessLabel, string> = {
  green:  'This is the day to push. Maximise intensity, attempt PRs, increase volume, or tackle heavy compound lifts. Your body is ready.',
  yellow: 'Stick to your planned workout but keep intensity moderate (70–80% 1RM). Focus on perfect form. Consider cutting 1–2 accessory exercises. Do not chase PRs today.',
  red:    'Recovery day. Skip the hard workout. Do light active recovery (walking, stretching, mobility) or take a complete rest day. Pushing through will increase injury risk and deepen fatigue.',
}

const ACTIVE_RECOVERY_IDEAS = [
  '🚶 20-minute brisk walk',
  '🧘 10-minute yoga or deep stretching',
  '🔄 Foam rolling — 5 min per major muscle group',
  '💧 Hydrate well (aim for 2–3 L water)',
  '😴 Take a 20-min nap if possible',
  '🌬 Box breathing: 4s in, 4s hold, 4s out × 5 rounds',
]

// ─── Metric Slider ────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
}

function MetricSlider({
  label,
  icon: Icon,
  value,
  onChange,
  invertLabel,
}: {
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  value: number
  onChange: (v: number) => void
  /** If true, low = good (e.g. Soreness: low is better) */
  invertLabel?: boolean
}) {
  const displayValue = invertLabel
    ? ({ 1: 'None', 2: 'Light', 3: 'Moderate', 4: 'High', 5: 'Very High' } as Record<number, string>)[value]
    : RATING_LABELS[value]

  const dotColor =
    value >= 4 ? '#22c55e'
    : value === 3 ? '#eab308'
    : '#FF453A'

  return (
    <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} strokeWidth={1.5} className="text-[#A1A1A6]" />
          <span className="text-[15px] font-semibold text-white">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
          <span className="text-[13px] font-medium text-[#A1A1A6]">
            {value} – {displayValue}
          </span>
        </div>
      </div>
      {/* Star buttons */}
      <div className="flex gap-2 justify-between">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-9 rounded-[2px] border text-[13px] font-semibold transition-colors ${
              n === value
                ? 'bg-[#93032E] border-[#93032E] text-white'
                : 'bg-[#2C2C2E] border-[#2C2C2E] text-[#A1A1A6] hover:border-[#93032E]/60'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({
  metrics,
  result,
  onRetake,
}: {
  metrics: Metrics
  result: ReadinessResult
  onRetake: () => void
}) {
  const navigate = useNavigate()
  const meta = LABEL_META[result.label]
  const [showRecovery, setShowRecovery] = useState(false)

  const ResultIcon = result.label === 'green'
    ? CheckCircle2
    : result.label === 'yellow'
    ? AlertTriangle
    : XCircle

  return (
    <div className="flex flex-col gap-4">

      {/* Label & Score */}
      <div
        className="bg-[#1C1C1E] border rounded-[4px] p-4 flex flex-col gap-2"
        style={{ borderColor: `${meta.color}60` }}
      >
        <div className="flex items-center gap-3">
          <ResultIcon size={28} strokeWidth={1.5} style={{ color: meta.color }} />
          <div>
            <p className="text-[20px] font-semibold text-white leading-tight">{meta.emoji} {meta.text}</p>
            <p className="text-[13px] font-medium" style={{ color: meta.color }}>Score: {result.total}/25</p>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-2 bg-[#2C2C2E] rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((result.total - 5) / 20) * 100}%`, background: meta.color }}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3 flex flex-col gap-1">
        <p className="text-[11px] font-semibold text-[#A1A1A6] uppercase tracking-widest">Summary</p>
        <p className="text-[15px] text-[#e4e2e4] leading-relaxed">{buildSummary(metrics, result)}</p>
      </div>

      {/* Action Plan */}
      <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3 flex flex-col gap-1">
        <p className="text-[11px] font-semibold text-[#A1A1A6] uppercase tracking-widest">Action Plan</p>
        <p className="text-[15px] text-[#e4e2e4] leading-relaxed">{ACTION_PLAN[result.label]}</p>
      </div>

      {/* Coach's Note */}
      <div
        className="bg-[#1C1C1E] border rounded-[4px] p-3 flex flex-col gap-1"
        style={{ borderColor: `${meta.color}40` }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: meta.color }}>Coach's Note</p>
        <p className="text-[15px] text-[#e4e2e4] leading-relaxed">{buildCoachNote(metrics, result)}</p>
      </div>

      {/* Actions */}
      {result.label === 'red' ? (
        <>
          <button
            onClick={() => setShowRecovery(v => !v)}
            className="w-full h-12 bg-[#1C1C1E] border border-[#2C2C2E] text-white font-semibold text-[15px] rounded-[2px] hover:border-[#93032E]/60 transition-colors"
          >
            {showRecovery ? 'Hide Recovery Ideas' : 'View Active Recovery Ideas'}
          </button>
          {showRecovery && (
            <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3 flex flex-col gap-2">
              {ACTIVE_RECOVERY_IDEAS.map((idea, i) => (
                <p key={i} className="text-[14px] text-[#e4e2e4]">{idea}</p>
              ))}
            </div>
          )}
        </>
      ) : (
        <button
          onClick={() => navigate('/plans')}
          className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px]"
        >
          Start Workout
        </button>
      )}

      <button
        onClick={onRetake}
        className="w-full h-10 flex items-center justify-center gap-2 text-[#A1A1A6] font-medium text-[14px]"
      >
        <RotateCcw size={14} strokeWidth={1.5} />
        Retake Assessment
      </button>

      <button
        onClick={() => navigate('/plans')}
        className="text-center text-[13px] text-[#A1A1A6] underline underline-offset-2 py-1"
      >
        Skip and go straight to workout
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReadinessPage() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<Metrics>({ sleep: 0, soreness: 0, energy: 0, stress: 0, motivation: 0 })
  const [result, setResult] = useState<ReadinessResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [todayEntry, setTodayEntry] = useState<ReadinessResult | null>(null)
  const [loadingToday, setLoadingToday] = useState(true)

  // Check if already completed today
  useEffect(() => {
    async function checkToday() {
      const today = todayKey()
      const existing = await db.readiness_scores.where('date').equals(today).first()
      if (existing) {
        setTodayEntry({ total: existing.total, label: existing.label, forced: existing.motivation === 1 })
        // Pre-fill metrics for retake
        setMetrics({
          sleep: existing.sleep,
          soreness: existing.soreness,
          energy: existing.energy,
          stress: existing.stress,
          motivation: existing.motivation,
        })
        setResult({ total: existing.total, label: existing.label, forced: existing.motivation === 1 })
      }
      setLoadingToday(false)
    }
    checkToday()
  }, [])

  const allAnswered = Object.values(metrics).every(v => v >= 1)

  function setMetric(key: keyof Metrics, value: number) {
    setMetrics(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!allAnswered) return
    setSaving(true)
    const r = calcResult(metrics)
    try {
      await upsertReadinessScore({
        date: todayKey(),
        sleep: metrics.sleep,
        soreness: metrics.soreness,
        energy: metrics.energy,
        stress: metrics.stress,
        motivation: metrics.motivation,
        total: r.total,
        label: r.label,
        createdAt: new Date().toISOString(),
      })
      setResult(r)
      setTodayEntry(r)
    } finally {
      setSaving(false)
    }
  }

  function handleRetake() {
    setResult(null)
  }

  if (loadingToday) {
    return (
      <div className="min-h-screen bg-[#151515] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#93032E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#151515] pb-24">
      <header className="sticky top-0 z-50 bg-[#151515]/90 backdrop-blur-md border-b border-[#2C2C2E] flex items-center px-3 h-14 gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-semibold text-white leading-tight">Daily Readiness Check</h1>
          {todayEntry && !result && (
            <p className="text-[11px] text-[#A1A1A6]">Completed today · tap to view result</p>
          )}
        </div>
      </header>

      <main className="px-4 pt-5 pb-8 max-w-2xl mx-auto flex flex-col gap-4">
        {result ? (
          <ResultCard metrics={metrics} result={result} onRetake={handleRetake} />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] font-semibold text-white">How are you feeling today?</h2>
              <p className="text-[14px] text-[#A1A1A6]">Rate each metric (1 = Poor, 5 = Excellent)</p>
            </div>

            <MetricSlider label="Sleep Quality"   icon={Moon}     value={metrics.sleep}      onChange={v => setMetric('sleep', v)} />
            <MetricSlider label="Muscle Soreness" icon={Dumbbell} value={metrics.soreness}   onChange={v => setMetric('soreness', v)} invertLabel />
            <MetricSlider label="Energy Levels"   icon={Zap}      value={metrics.energy}     onChange={v => setMetric('energy', v)} />
            <MetricSlider label="Life Stress"     icon={Brain}    value={metrics.stress}     onChange={v => setMetric('stress', v)} invertLabel />
            <MetricSlider label="Motivation"      icon={Flame}    value={metrics.motivation} onChange={v => setMetric('motivation', v)} />

            {/* Progress hint */}
            {!allAnswered && (
              <p className="text-[13px] text-[#A1A1A6] text-center">
                {Object.values(metrics).filter(v => v >= 1).length}/5 rated
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!allAnswered || saving}
              className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] disabled:opacity-50 transition-opacity mt-2"
            >
              {saving ? 'Saving…' : 'Get Recommendation'}
            </button>

            <button
              onClick={() => navigate('/plans')}
              className="text-center text-[13px] text-[#A1A1A6] underline underline-offset-2 py-1"
            >
              Skip and go straight to workout
            </button>
          </>
        )}
      </main>
    </div>
  )
}
