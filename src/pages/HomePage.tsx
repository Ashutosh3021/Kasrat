import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, ChevronRight } from 'lucide-react'
import TopBar from '../components/TopBar'
import { db, type Plan, type GymSet } from '../db/database'
import { format } from '../utils/dateUtils'

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
      className="w-full bg-[#1C1C1E] rounded-[8px] border border-[#2C2C2E] p-3 flex flex-col gap-3 text-left active:scale-[0.98] transition-transform hover:border-[#3B82F6]/40"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[17px] font-semibold text-white leading-tight">
            {session.planTitle}
          </span>
          <span className="text-[13px] font-medium text-[#c6c6cb]">
            {format(session.latestCreated)}
          </span>
        </div>
        <ChevronRight size={18} className="text-[#424754] shrink-0" />
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-1.5">
        {visible.map(ex => (
          <div key={ex.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">
                {ex.cardio ? '🏃' : '🏋️'}
              </span>
              <span className="text-[15px] text-[#e4e2e4]">{ex.name}</span>
            </div>
            <span className="text-[13px] font-medium text-[#c6c6cb]">
              {ex.sets} {ex.sets === 1 ? 'set' : 'sets'}
            </span>
          </div>
        ))}
        {extra > 0 && (
          <span className="text-[13px] font-medium text-[#8c909f]">
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
  const [todayPlan, setTodayPlan] = useState<Plan | null>(null)
  const [planExercises, setPlanExercises] = useState<string[]>([])
  const [weekSets, setWeekSets] = useState(0)
  const [weekExercises, setWeekExercises] = useState(0)
  const [mostUsed, setMostUsed] = useState('')
  const [sessions, setSessions] = useState<WorkoutSession[]>([])

  const today = new Date()
  const dayOfWeek = today.getDay()

  useEffect(() => {
    async function load() {
      // ── Today's plan ──────────────────────────────────────────────────────
      const plans = await db.plans.toArray()
      const todaysPlan = plans.find(p => {
        const days = p.days.split(',').map(Number)
        return days.includes(dayOfWeek)
      })
      setTodayPlan(todaysPlan ?? null)
      if (todaysPlan) {
        setPlanExercises(todaysPlan.exercises.split(',').filter(Boolean))
      }

      // ── Weekly stats ──────────────────────────────────────────────────────
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const allSets = await db.gym_sets.toArray()
      const weekSetsList = allSets.filter(s => new Date(s.created) >= weekStart)
      setWeekSets(weekSetsList.length)
      setWeekExercises(new Set(weekSetsList.map(s => s.name)).size)

      // ── Most used ─────────────────────────────────────────────────────────
      const counts: Record<string, number> = {}
      allSets.forEach(s => { counts[s.name] = (counts[s.name] ?? 0) + 1 })
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      setMostUsed(top ? top[0] : 'None yet')

      // ── Recent sessions (last 7 days) ─────────────────────────────────────
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentSets = allSets.filter(
        s => new Date(s.created) >= sevenDaysAgo,
      )

      // Build plan-title lookup in one pass
      const planTitles = new Map<number, string>(
        plans.map(p => [p.id!, p.title]),
      )

      setSessions(buildSessions(recentSets, planTitles).slice(0, 5))
    }
    load()
  }, [dayOfWeek])

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]}`

  return (
    <div className="min-h-screen bg-black pb-24 pt-14">
      <TopBar />
      <main className="px-4 space-y-8 max-w-2xl mx-auto">
        <div className="pt-4">
          <p className="text-[13px] font-medium text-[#c6c6cb]">{dateStr}</p>
          <h1 className="text-[32px] font-bold leading-10 tracking-tight text-white mt-1">Ready to lift?</h1>
        </div>

        {/* Today's plan card */}
        {todayPlan ? (
          <section className="bg-[#1C1C1E] rounded-[8px] p-3 border border-[#2C2C2E] flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#3B82F6]/10 rounded-full blur-2xl" />
            <div className="flex justify-between items-center z-10">
              <h2 className="text-[22px] font-semibold leading-7 text-white">{todayPlan.title}</h2>
              <div className="bg-[#2C2C2E] rounded-full px-3 py-1">
                <span className="text-[13px] font-medium text-white">Strength</span>
              </div>
            </div>
            <div className="space-y-3 z-10">
              {planExercises.slice(0, 3).map((ex, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[15px] text-white">{ex}</span>
                    <span className="text-[13px] font-medium text-[#c6c6cb]">0/3 sets</span>
                  </div>
                  <div className="h-1.5 bg-[#2C2C2E] rounded-full w-full overflow-hidden">
                    <div className="h-full bg-[#3B82F6] w-0 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate(`/start-plan/${todayPlan.id}`)}
              className="w-full bg-[#3B82F6] text-white font-semibold h-12 rounded-[12px] mt-2 flex items-center justify-center gap-2 z-10"
            >
              <Play size={18} fill="white" />
              Start Workout
            </button>
          </section>
        ) : (
          <section className="bg-[#1C1C1E] rounded-[8px] p-3 border border-[#2C2C2E] text-center py-8">
            <p className="text-[#c6c6cb] text-[15px]">No plan scheduled for today</p>
            <button onClick={() => navigate('/plans')} className="mt-3 text-[#3B82F6] font-semibold text-[15px]">View Plans →</button>
          </section>
        )}

        {/* Weekly stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-[#1C1C1E] rounded-[8px] p-3 border border-[#2C2C2E] flex flex-col justify-between min-h-[100px]">
            <span className="text-[13px] font-medium text-[#c6c6cb]">This Week</span>
            <div className="flex items-end gap-2">
              <span className="text-[32px] font-bold leading-none text-white">{weekExercises}</span>
              <span className="text-[13px] font-medium text-[#c6c6cb] mb-1">Exercises</span>
            </div>
          </div>
          <div className="bg-[#1C1C1E] rounded-[8px] p-3 border border-[#2C2C2E] flex flex-col justify-between min-h-[100px]">
            <span className="text-[13px] font-medium text-[#c6c6cb]">This Week</span>
            <div className="flex items-end gap-2">
              <span className="text-[32px] font-bold leading-none text-white">{weekSets}</span>
              <span className="text-[13px] font-medium text-[#c6c6cb] mb-1">Sets</span>
            </div>
          </div>
          <div className="bg-[#1C1C1E] rounded-[8px] p-3 border border-[#2C2C2E] flex flex-col justify-between col-span-2 relative overflow-hidden min-h-[80px]">
            <span className="text-[13px] font-medium text-[#c6c6cb] z-10">Most Used</span>
            <span className="text-[22px] font-semibold text-white mt-1 z-10">{mostUsed}</span>
          </div>
        </section>

        {/* Recent Activity — grouped by session */}
        {sessions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[22px] font-semibold text-white">Recent Activity</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-[13px] font-medium text-[#3B82F6]"
              >
                See all
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {sessions.map(session => (
                <SessionCard
                  key={session.key}
                  session={session}
                  onTap={() =>
                    // Navigate to history; if it was a plan session, the user
                    // can search by plan name there. Deep-linking with a filter
                    // query param is a future enhancement.
                    navigate('/history')
                  }
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
