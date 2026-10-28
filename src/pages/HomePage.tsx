import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, ChevronRight, Dumbbell, Zap, Activity, BarChart3, CalendarDays, Apple, TrendingUp, Sparkles } from 'lucide-react'
import TopBar from '../components/TopBar'
import { db, type Plan, type GymSet, type ReadinessLabel } from '../db/database'
import { useWorkoutStore } from '../store/workoutStore'
import { supabase } from '../supabase/client'
import { useOnSyncComplete } from '../hooks/useOnSyncComplete'
import { refreshStreak } from '../services/streakService'
import StreakCard from '../components/StreakCard'
// ── New feature widgets (Features 3, 6) ───────────────────────────────────
import WeightEntryWidget from '../features/weightMonitoring/WeightEntryWidget'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseInSession {
  name: string
  sets: number
  cardio: boolean
}

interface WorkoutSession {
  /** Unique key: "<planId|'quick'>_<YYYY-MM-DD>" */
  key: string
  planId: number | null
  planTitle: string
  date: string          // YYYY-MM-DD
  latestCreated: string // ISO — used for "2h ago" label and sort
  exercises: ExerciseInSession[]
}

const QUICK_LINKS = [
  { label: 'Body stats', detail: 'Weight & measures', path: '/body-measurements', icon: Activity },
  { label: 'Weekly stats', detail: 'Volume & trends', path: '/stats', icon: BarChart3 },
  { label: 'Calendar', detail: 'Your training month', path: '/calendar', icon: CalendarDays },
  { label: 'Nutrition', detail: 'Fuel and macros', path: '/nutrition', icon: Apple },
  { label: 'Progress', detail: 'The long view', path: '/progress', icon: TrendingUp },
  { label: 'Generate plan', detail: 'Built around you', path: '/generate-plan', icon: Sparkles },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Correctly formats session date, distinguishing today, yesterday, N days ago, or absolute date calendar-wise */
function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  
  // Clear time components to compare calendar days
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const diffTime = nowDate.getTime() - dDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    const diffMs = now.getTime() - d.getTime()
    const hours = Math.max(0, Math.floor(diffMs / 3600000))
    if (hours < 1) return 'Just now'
    return `${hours}h ago`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Build session list from raw sets + plan title map */
function buildSessions(
  sets: GymSet[],
  planTitles: Map<number, string>,
): WorkoutSession[] {
  // Only real sets (not hidden template rows)
  const real = sets.filter(
    s => !s.hidden || s.reps > 0 || s.weight > 0 || s.distance > 0,
  )

  const sessionMap = new Map<string, WorkoutSession>()

  for (const s of real) {
    const day = s.created.slice(0, 10)
    const sessionKey = s.planId != null ? `${s.planId}_${day}` : `quick_${day}`

    if (!sessionMap.has(sessionKey)) {
      sessionMap.set(sessionKey, {
        key: sessionKey,
        planId: s.planId ?? null,
        planTitle:
          s.planId != null
            ? (planTitles.get(s.planId) ?? 'Workout')
            : 'Quick Workout',
        date: day,
        latestCreated: s.created,
        exercises: [],
      })
    }

    const session = sessionMap.get(sessionKey)!

    // Update latest timestamp
    if (s.created > session.latestCreated) session.latestCreated = s.created

    // Accumulate set count per exercise
    const existing = session.exercises.find(e => e.name === s.name)
    if (existing) {
      existing.sets += 1
    } else {
      session.exercises.push({ name: s.name, sets: 1, cardio: s.cardio })
    }
  }

  // Sort sessions newest-first
  return Array.from(sessionMap.values()).sort(
    (a, b) =>
      new Date(b.latestCreated).getTime() - new Date(a.latestCreated).getTime(),
  )
}

// ─── Session card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: WorkoutSession
  onTap: () => void
}

function SessionCard({ session, onTap }: SessionCardProps) {
  // Show at most 4 exercises, then "+N more"
  const visible = session.exercises.slice(0, 4)
  const extra = session.exercises.length - visible.length
  const exerciseNames = visible.map(ex => ex.name).join(' · ')

  return (
    <button
      type="button"
      onClick={onTap}
      className="card card-hover group flex w-full items-center gap-3.5 p-4 text-left"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-high text-accent-soft transition-colors group-hover:border-accent/40">
        <Dumbbell size={18} strokeWidth={1.7} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-ink">
            {session.planTitle}
          </span>
          <span className="mono shrink-0 text-[10px] uppercase tracking-[0.08em] text-muted-dim">
            {formatSessionDate(session.latestCreated)}
          </span>
        </span>
        <span className="mt-1 block truncate text-[12px] text-muted">
          {exerciseNames}
          {extra > 0 ? ` · +${extra} more` : ''}
        </span>
      </span>

      <ChevronRight size={16} className="shrink-0 text-muted-dim transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  )
}

// ─── Readiness Chip ───────────────────────────────────────────────────────────

const READINESS_META: Record<ReadinessLabel, { text: string; color: string }> = {
  green:  { text: 'Primed to perform', color: 'var(--color-success)' },
  yellow: { text: 'Baseline',          color: 'var(--color-warning)' },
  red:    { text: 'Recovery day',      color: 'var(--color-danger)' },
}

function ReadinessCard({
  todayLabel,
  todayScore,
  onNavigate,
}: {
  todayLabel: ReadinessLabel | null
  todayScore: number | null
  onNavigate: () => void
}) {
  if (todayLabel !== null && todayScore !== null) {
    const meta = READINESS_META[todayLabel]
    return (
      <button
        type="button"
        onClick={onNavigate}
        className="card card-hover flex w-full items-center gap-3.5 p-4 text-left"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)`,
            background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
            color: meta.color,
          }}
        >
          <Activity size={17} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="kicker">Readiness</span>
          <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">{meta.text}</span>
        </span>
        <span className="flex items-baseline gap-0.5" style={{ color: meta.color }}>
          <span className="stat-value text-[26px]">{todayScore}</span>
          <span className="mono text-[10px] text-muted">/25</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted-dim" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="card card-hover flex w-full items-center gap-3.5 p-4 text-left"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent-soft">
        <Zap size={17} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="kicker">Daily check-in</span>
        <span className="mt-0.5 block text-[15px] font-semibold text-ink">How are you feeling today?</span>
      </span>
      <span className="chip chip-accent">Check</span>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const { activePlanId, activePlanTitle } = useWorkoutStore()
  const [todayPlans, setTodayPlans] = useState<Plan[]>([])
  const [planExerciseCounts, setPlanExerciseCounts] = useState<Record<number, number>>({})
  const [weekSets, setWeekSets] = useState(0)
  const [weekExercises, setWeekExercises] = useState(0)
  const [mostUsed, setMostUsed] = useState('')
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [expanded, setExpanded] = useState(false)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [userName, setUserName] = useState('')
  const [todayReadinessLabel, setTodayReadinessLabel] = useState<ReadinessLabel | null>(null)
  const [todayReadinessScore, setTodayReadinessScore] = useState<number | null>(null)

  const today = new Date()
  const dayOfWeek = today.getDay()

  const loadHomeData = useCallback(async () => {
    const plans = await db.plans.toArray()
    const todayMatchingPlans = plans.filter(p => {
      const days = p.days.split(',').map(Number)
      return days.includes(dayOfWeek)
    })
    setTodayPlans(todayMatchingPlans)
    const counts: Record<number, number> = {}
    todayMatchingPlans.forEach(p => {
      counts[p.id!] = p.exercises.split(',').filter(Boolean).length
    })
    setPlanExerciseCounts(counts)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const allSets = await db.gym_sets.toArray()

    const realSets = allSets.filter(
      s => !s.hidden && !(s.weight === 0 && s.reps === 0 && s.distance === 0)
    )
    const weekSetsList = realSets.filter(s => new Date(s.created) >= weekStart)
    setWeekSets(weekSetsList.length)
    setWeekExercises(new Set(weekSetsList.map(s => s.name)).size)

    const usageCounts: Record<string, number> = {}
    realSets.forEach(s => { usageCounts[s.name] = (usageCounts[s.name] ?? 0) + 1 })
    const top = Object.entries(usageCounts).sort((a, b) => b[1] - a[1])[0]
    setMostUsed(top ? top[0] : 'None yet')

    const planTitles = new Map<number, string>(plans.map(p => [p.id!, p.title]))
    setSessions(buildSessions(realSets, planTitles).slice(0, 10))

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('name').eq('id', user.id).maybeSingle()
      if (profile?.name) setUserName(profile.name)
    }

    await refreshStreak({ announce: true })

    // Readiness check for today
    const todayStr = new Date().toLocaleDateString('en-CA')
    const readiness = await db.readiness_scores.where('date').equals(todayStr).first()
    if (readiness) {
      setTodayReadinessLabel(readiness.label)
      setTodayReadinessScore(readiness.total)
    } else {
      setTodayReadinessLabel(null)
      setTodayReadinessScore(null)
    }
  }, [dayOfWeek])

  useEffect(() => { loadHomeData() }, [loadHomeData])
  useOnSyncComplete(loadHomeData)

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]}`

  function handleStartPlan(plan: Plan) {
    if (activePlanId && activePlanId !== plan.id) {
      setShowConflictDialog(true)
    } else {
      navigate(`/start-plan/${plan.id}`)
    }
  }

  function handleEmptyWorkout() {
    if (activePlanId) {
      setShowConflictDialog(true)
    } else {
      navigate('/quick-workout')
    }
  }

  return (
    <div className="page pt-14">
      <TopBar />
      <main className="page-main space-y-7">
        <header className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="kicker">{dateStr}</p>
            <h1 className="display-hero mt-3">
              {userName ? (
                <>Ready to<br /> lift, <span className="text-accent-soft">{userName}</span>?</>
              ) : (
                <>Ready to<br /> lift?</>
              )}
            </h1>
          </div>
          <div className="mb-1 flex shrink-0 flex-col items-end rounded-2xl border border-line bg-surface/80 p-3 backdrop-blur">
            <span className="kicker">Week</span>
            <span className="stat-value mt-1.5">{weekSets}</span>
            <span className="stat-label mt-1">sets</span>
          </div>
        </header>

        {activePlanId && (
          <section className="flex items-center gap-3 rounded-[18px] border border-accent/35 bg-accent/10 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent">
              <Dumbbell size={18} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="kicker text-accent-soft">Session paused</p>
              <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">{activePlanTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/start-plan/${activePlanId}`)}
              className="btn btn-sm btn-primary shrink-0"
            >
              Resume
            </button>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="kicker">On deck</p>
              <h2 className="section-title mt-1">Today’s training</h2>
            </div>
            <span className="chip">{todayPlans.length > 0 ? `${todayPlans.length} ready` : 'Rest day'}</span>
          </div>

          {todayPlans.length > 0 ? (
            <div className="stagger space-y-3">
              {todayPlans.map(plan => (
                <article key={plan.id} className="hero-panel card overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="chip chip-accent">Today</span>
                      <span className="mono text-[10px] uppercase tracking-[0.1em] text-muted">
                        {planExerciseCounts[plan.id!] ?? 0} exercises
                      </span>
                    </div>
                    <h3 className="display mt-7 text-[32px] text-ink">{plan.title}</h3>
                    <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-muted">
                      The work is already planned. All that is left is to show up.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartPlan(plan)}
                      className="btn btn-primary mt-5 w-full"
                    >
                      <Play size={16} strokeWidth={1.7} fill="currentColor" />
                      Start workout
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card flex flex-col items-center px-6 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface-high text-muted">
                <Dumbbell size={19} strokeWidth={1.7} />
              </span>
              <h3 className="mt-4 text-[18px] font-bold tracking-[-0.03em] text-ink">Rest day. Recover well.</h3>
              <p className="mt-1 max-w-[30ch] text-[13px] leading-relaxed text-muted">
                No plan is scheduled today. Take the recovery, or pick something for later.
              </p>
              <button type="button" onClick={() => navigate('/plans')} className="btn btn-secondary btn-sm mt-4">
                Browse plans
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleEmptyWorkout}
            className="card card-hover group flex w-full items-center gap-3.5 p-4 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-high text-accent-soft">
              <Zap size={17} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">Empty workout</span>
              <span className="mt-0.5 block text-[12px] text-muted">Start from a blank slate</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-muted-dim transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
          </button>
        </section>

        <StreakCard />

        <section className="space-y-3">
          <div>
            <p className="kicker">Daily check-in</p>
            <h2 className="section-title mt-1">Read the body</h2>
          </div>
          <ReadinessCard
            todayLabel={todayReadinessLabel}
            todayScore={todayReadinessScore}
            onNavigate={() => navigate('/readiness')}
          />
          <WeightEntryWidget />
        </section>

        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="kicker">Week load</p>
              <h2 className="section-title mt-1">Consistency</h2>
            </div>
            <span className="chip">{weekExercises} exercises</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <span className="stat-value block">{weekSets}</span>
              <span className="stat-label mt-2 block">Sets logged</span>
            </div>
            <div>
              <span className="stat-value block">{weekExercises}</span>
              <span className="stat-label mt-2 block">Exercises</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
            <span className="kicker">Most trained</span>
            <span className="max-w-[60%] truncate text-right text-[13px] font-semibold text-ink-soft">{mostUsed}</span>
          </div>
        </section>

        {sessions.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="kicker">The log</p>
                <h2 className="section-title mt-1">Recent sessions</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="mono text-[10px] uppercase tracking-[0.12em] text-accent-soft transition-opacity hover:opacity-70"
              >
                See all
              </button>
            </div>
            <div className="space-y-2.5">
              {(expanded ? sessions : sessions.slice(0, 3)).map(session => (
                <SessionCard
                  key={session.key}
                  session={session}
                  onTap={() => navigate('/history')}
                />
              ))}
            </div>
            {sessions.length > 3 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="btn btn-ghost btn-sm"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              </div>
            )}
          </section>
        )}

        <section className="space-y-3 pb-4">
          <div>
            <p className="kicker">Tools</p>
            <h2 className="section-title mt-1">Beyond the bar</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="card card-hover flex min-h-[104px] flex-col items-start justify-between p-4 text-left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-high text-accent-soft">
                    <Icon size={15} strokeWidth={1.8} />
                  </span>
                  <span className="mt-4 block">
                    <span className="block text-[13px] font-semibold leading-tight text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-muted">{item.detail}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </main>

      {showConflictDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ground/80 p-4 backdrop-blur-md">
          <div className="card w-full max-w-sm p-6">
            <p className="kicker text-accent-soft">Heads up</p>
            <h3 className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-ink">Workout in progress</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">{activePlanTitle}</span> is still active. Finish it before starting another session.
            </p>
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowConflictDialog(false)
                  navigate(activePlanId === -1 ? '/quick-workout' : `/start-plan/${activePlanId}`)
                }}
                className="btn btn-primary w-full"
              >
                Go to current session
              </button>
              <button
                type="button"
                onClick={() => { setShowConflictDialog(false) }}
                className="btn btn-secondary w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
