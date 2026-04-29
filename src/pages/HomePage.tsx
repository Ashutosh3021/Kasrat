import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, ChevronRight, Dumbbell, Zap } from 'lucide-react'
import TopBar from '../components/TopBar'
import { db, type Plan, type GymSet } from '../db/database'
import { format } from '../utils/dateUtils'
import { useWorkoutStore } from '../store/workoutStore'
import { supabase } from '../supabase/client'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  return (
    <button
      onClick={onTap}
      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col gap-3 text-left active:scale-[0.98] transition-transform hover:border-[#93032E]/40"
      style={{ borderRadius: '4px' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-semibold text-white leading-tight">
            {session.planTitle}
          </span>
          <span className="text-[13px] font-medium text-[#A1A1A6]">
            {format(session.latestCreated)}
          </span>
        </div>
        <ChevronRight size={18} className="text-[#424754] shrink-0" />
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-1.5">
        {visible.map(ex => (
          <div key={ex.name} className="flex items-center justify-between">
            <span className="text-[15px] text-[#e4e2e4]">{ex.name}</span>
            <span className="text-[13px] font-medium text-[#A1A1A6]">
              {ex.sets} {ex.sets === 1 ? 'set' : 'sets'}
            </span>
          </div>
        ))}
        {extra > 0 && (
          <span className="text-[13px] font-medium text-[#A1A1A6]">
            +{extra} more exercise{extra > 1 ? 's' : ''}
          </span>
        )}
      </div>
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
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictTargetId, setConflictTargetId] = useState<number | null>(null)
  const [userName, setUserName] = useState('')

  const today = new Date()
  const dayOfWeek = today.getDay()

  useEffect(() => {
    async function load() {
      // ── Today's plans (all matching today's day) ─────────────────────────
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

      // ── Weekly stats — exclude hidden/template sets ────────────────────────
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const allSets = await db.gym_sets.toArray()

      // Real sets: not hidden, and have actual data
      const realSets = allSets.filter(
        s => !s.hidden && !(s.weight === 0 && s.reps === 0 && s.distance === 0)
      )
      const weekSetsList = realSets.filter(s => new Date(s.created) >= weekStart)
      setWeekSets(weekSetsList.length)
      setWeekExercises(new Set(weekSetsList.map(s => s.name)).size)

      // ── Most used (real sets only) ─────────────────────────────────────────
      const usageCounts: Record<string, number> = {}
      realSets.forEach(s => { usageCounts[s.name] = (usageCounts[s.name] ?? 0) + 1 })
      const top = Object.entries(usageCounts).sort((a, b) => b[1] - a[1])[0]
      setMostUsed(top ? top[0] : 'None yet')

      // ── Recent sessions (last 7 days, real sets only) ─────────────────────
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentSets = realSets.filter(s => new Date(s.created) >= sevenDaysAgo)
      const planTitles = new Map<number, string>(plans.map(p => [p.id!, p.title]))
      setSessions(buildSessions(recentSets, planTitles).slice(0, 5))

      // ── User name from Supabase profile ───────────────────────────────
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('name').eq('id', user.id).maybeSingle()
        if (profile?.name) setUserName(profile.name)
      }
    }
    load()
  }, [dayOfWeek])

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]}`

  function handleStartPlan(plan: Plan) {
    if (activePlanId && activePlanId !== plan.id) {
      setConflictTargetId(plan.id!)
      setShowConflictDialog(true)
    } else {
      navigate(`/start-plan/${plan.id}`)
    }
  }

  function handleEmptyWorkout() {
    if (activePlanId) {
      setConflictTargetId(null)
      setShowConflictDialog(true)
    } else {
      navigate('/quick-workout')
    }
  }

  return (
    <div className="min-h-screen bg-[#151515] pb-24 pt-14">
      <TopBar />
      <main className="px-4 space-y-8 max-w-2xl mx-auto">
        <div className="pt-4">
          <p className="text-[13px] font-medium text-[#A1A1A6]">{dateStr}</p>
          <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-white mt-1">
            {userName
              ? <>Ready to lift, <span className="text-[#93032E]">{userName}</span>?</>
              : 'Ready to lift?'}
          </h1>
        </div>

        {/* Resume banner */}
        {activePlanId && (
          <section className="bg-[#93032E]/10 border border-[#93032E]/40 p-3 flex items-center justify-between" style={{ borderRadius: '4px' }}>
            <div className="flex items-center gap-3">
              <Dumbbell size={20} strokeWidth={1.5} className="text-[#93032E] shrink-0" />
              <div>
                <p className="text-[15px] font-medium text-white">Unfinished workout</p>
                <p className="text-[13px] text-[#A1A1A6]">{activePlanTitle}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/start-plan/${activePlanId}`)}
              className="text-[#93032E] font-medium text-[13px] shrink-0"
            >
              Resume
            </button>
          </section>
        )}

        {/* Today's plan cards */}
        {todayPlans.length > 0 ? (
          <div className="flex flex-col gap-3">
            {todayPlans.map(plan => (
              <section key={plan.id} className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col gap-3" style={{ borderRadius: '4px' }}>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-[22px] font-semibold text-white leading-tight">{plan.title}</h2>
                    <span className="text-[13px] font-medium text-[#A1A1A6]">
                      {planExerciseCounts[plan.id!] ?? 0} exercise{(planExerciseCounts[plan.id!] ?? 0) !== 1 ? 's' : ''} scheduled
                    </span>
                  </div>
                  <div className="bg-[#2C2C2E] px-2 py-1 shrink-0" style={{ borderRadius: '2px' }}>
                    <span className="text-[11px] font-medium text-[#A1A1A6]">TODAY</span>
                  </div>
                </div>
                <button
                  onClick={() => handleStartPlan(plan)}
                  className="w-full bg-[#93032E] text-white font-medium h-11 flex items-center justify-center gap-2"
                  style={{ borderRadius: '2px' }}
                >
                  <Play size={16} strokeWidth={1.5} fill="white" />
                  Start Workout
                </button>
              </section>
            ))}
          </div>
        ) : (
          <section className="bg-[#1C1C1E] border border-[#2C2C2E] text-center py-8" style={{ borderRadius: '4px' }}>
            <p className="text-[#A1A1A6] text-[15px]">No plan scheduled for today</p>
            <button onClick={() => navigate('/plans')} className="mt-3 text-[#93032E] font-medium text-[15px]">View Plans</button>
          </section>
        )}

        {/* Empty / Quick workout */}
        <button
          onClick={handleEmptyWorkout}
          className="w-full bg-[#1C1C1E] border border-[#2C2C2E] h-11 flex items-center justify-center gap-2 text-[#A1A1A6] font-medium text-[15px] hover:border-[#93032E]/40 transition-colors"
          style={{ borderRadius: '2px' }}
        >
          <Zap size={16} strokeWidth={1.5} />
          Empty Workout
        </button>

        {/* Weekly stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col justify-between min-h-[100px]" style={{ borderRadius: '4px' }}>
            <span className="text-[13px] font-medium text-[#A1A1A6]">This Week</span>
            <div className="flex items-end gap-2">
              <span className="text-[32px] font-semibold leading-none text-white">{weekExercises}</span>
              <span className="text-[13px] font-medium text-[#A1A1A6] mb-1">Exercises</span>
            </div>
          </div>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col justify-between min-h-[100px]" style={{ borderRadius: '4px' }}>
            <span className="text-[13px] font-medium text-[#A1A1A6]">This Week</span>
            <div className="flex items-end gap-2">
              <span className="text-[32px] font-semibold leading-none text-white">{weekSets}</span>
              <span className="text-[13px] font-medium text-[#A1A1A6] mb-1">Sets</span>
            </div>
          </div>
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col justify-between col-span-2 relative overflow-hidden min-h-[80px]" style={{ borderRadius: '4px' }}>
            <span className="text-[13px] font-medium text-[#A1A1A6] z-10">Most Used</span>
            <span className="text-[22px] font-medium text-white mt-1 z-10">{mostUsed}</span>
          </div>
        </section>

        {/* Recent Activity — grouped by session */}
        {sessions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[22px] font-medium text-white">Recent Activity</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-[13px] font-medium text-[#93032E]"
              >
                See all
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {sessions.map(session => (
                <SessionCard
                  key={session.key}
                  session={session}
                  onTap={() => navigate('/history')}
                />
              ))}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3 pb-4">
          <button
            onClick={() => navigate('/body-measurements')}
            className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex items-center gap-3 hover:border-[#93032E]/40 transition-colors"
            style={{ borderRadius: '4px' }}
          >
            <span className="text-[15px] font-medium text-white">Body Stats</span>
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex items-center gap-3 hover:border-[#93032E]/40 transition-colors"
            style={{ borderRadius: '4px' }}
          >
            <span className="text-[15px] font-medium text-white">Weekly Stats</span>
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex items-center gap-3 hover:border-[#93032E]/40 transition-colors"
            style={{ borderRadius: '4px' }}
          >
            <span className="text-[15px] font-medium text-white">Calendar</span>
          </button>
          <button
            onClick={() => navigate('/nutrition')}
            className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex items-center gap-3 hover:border-[#93032E]/40 transition-colors"
            style={{ borderRadius: '4px' }}
          >
            <span className="text-[15px] font-medium text-white">Nutrition</span>
          </button>
        </section>
      </main>

      {/* Concurrent session conflict dialog */}
      {showConflictDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#151515]/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1C1C1E] border border-[#2C2C2E] p-3 flex flex-col gap-4" style={{ borderRadius: '4px' }}>
            <h3 className="text-[22px] font-medium text-white">Workout in Progress</h3>
            <p className="text-[15px] text-[#A1A1A6]">
              <span className="text-white font-medium">{activePlanTitle}</span> is still active.
              Finish it before starting a new one.
            </p>
            <button
              onClick={() => {
                setShowConflictDialog(false)
                navigate(activePlanId === -1 ? '/quick-workout' : `/start-plan/${activePlanId}`)
              }}
              className="w-full h-12 bg-[#93032E] text-white font-medium text-[15px]"
              style={{ borderRadius: '2px' }}
            >
              Go to Current Session
            </button>
            <button
              onClick={() => { setShowConflictDialog(false); setConflictTargetId(null) }}
              className="w-full h-12 border border-[#2C2C2E] text-white font-medium text-[15px]"
              style={{ borderRadius: '2px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
