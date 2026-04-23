import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import TopBar from '../components/TopBar'
import { db, type Plan, type GymSet } from '../db/database'
import { format } from '../utils/dateUtils'

export default function HomePage() {
  const navigate = useNavigate()
  const [todayPlan, setTodayPlan] = useState<Plan | null>(null)
  const [planExercises, setPlanExercises] = useState<string[]>([])
  const [weekSets, setWeekSets] = useState(0)
  const [weekExercises, setWeekExercises] = useState(0)
  const [mostUsed, setMostUsed] = useState('')
  const [recentSets, setRecentSets] = useState<GymSet[]>([])

  const today = new Date()
  const dayOfWeek = today.getDay()

  useEffect(() => {
    async function load() {
      const plans = await db.plans.toArray()
      const todaysPlan = plans.find(p => {
        const days = p.days.split(',').map(Number)
        return days.includes(dayOfWeek)
      })
      setTodayPlan(todaysPlan ?? null)
      if (todaysPlan) {
        const exs = todaysPlan.exercises.split(',').filter(Boolean)
        setPlanExercises(exs)
      }

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const allSets = await db.gym_sets.toArray()
      const weekSetsList = allSets.filter(s => new Date(s.created) >= weekStart)
      setWeekSets(weekSetsList.length)
      const uniqueEx = new Set(weekSetsList.map(s => s.name))
      setWeekExercises(uniqueEx.size)

      const counts: Record<string, number> = {}
      allSets.forEach(s => { counts[s.name] = (counts[s.name] ?? 0) + 1 })
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      setMostUsed(top ? top[0] : 'None yet')

      const recent = allSets.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()).slice(0, 5)
      setRecentSets(recent)
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

        {recentSets.length > 0 && (
          <section>
            <h3 className="text-[22px] font-semibold text-white mb-4">Recent Activity</h3>
            <div className="bg-[#1C1C1E] rounded-[8px] border border-[#2C2C2E] overflow-hidden">
              <div className="px-3 py-2 bg-[#1b1b1d] border-b border-[#2C2C2E]">
                <span className="text-[13px] font-medium text-[#c6c6cb]">Recent</span>
              </div>
              <div className="divide-y divide-[#2C2C2E]">
                {recentSets.map(s => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/graphs/${encodeURIComponent(s.name)}`)}
                    className="flex items-center justify-between p-3 w-full hover:bg-[#1b1b1d] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2a2a2c] flex items-center justify-center text-[#c6c6cb]">
                        <span className="text-lg">🏋️</span>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[15px] text-white">{s.name}</span>
                        <span className="text-[13px] font-medium text-[#c6c6cb]">{s.weight} {s.unit} × {s.reps} reps</span>
                      </div>
                    </div>
                    <span className="text-[13px] text-[#c6c6cb]">{format(s.created)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
