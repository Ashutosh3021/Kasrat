import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MoreHorizontal } from 'lucide-react'
import TopBar from '../components/TopBar'
import DayPills from '../components/DayPills'
import { db, type Plan } from '../db/database'
import { useUIStore } from '../store/uiStore'
import NewPlanDialog from '../overlays/NewPlanDialog'

export default function PlansPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const { openNewPlan, newPlanOpen } = useUIStore()

  async function loadPlans() {
    const p = await db.plans.orderBy('sequence').toArray()
    setPlans(p)
  }

  useEffect(() => { loadPlans() }, [])

  return (
    <div className="min-h-screen bg-black pb-24 pt-14">
      <TopBar />
      <main className="px-4 pt-6 max-w-md mx-auto flex flex-col gap-4">
        <h1 className="text-[32px] font-bold leading-10 tracking-tight text-white">Plans</h1>

        {plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#c6c6cb] text-[15px]">No plans yet. Create your first plan!</p>
          </div>
        ) : (
          plans.map(plan => {
            const days = plan.days.split(',').map(Number).filter(n => !isNaN(n))
            const exCount = plan.exercises.split(',').filter(Boolean).length
            return (
              <article
                key={plan.id}
                onClick={() => navigate(`/edit-plan/${plan.id}`)}
                className="bg-[#1b1b1d] rounded-lg p-3 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden border border-[#2C2C2E]"
              >
                <div className="absolute -left-8 -top-8 w-24 h-24 bg-[#adc6ff]/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex justify-between items-start z-10">
                  <h2 className="text-[22px] font-semibold text-white">{plan.title}</h2>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/edit-plan/${plan.id}`) }}
                    className="text-[#8c909f] hover:text-white transition-colors p-1"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <DayPills activeDays={days} readonly />
                <div className="flex items-center gap-1.5 text-[#c2c6d6] z-10">
                  <span className="text-[16px]">🏋️</span>
                  <span className="text-[13px] font-medium">{exCount} exercises</span>
                </div>
              </article>
            )
          })
        )}
      </main>

      <button
        onClick={openNewPlan}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#adc6ff] text-[#002e6a] rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.5)] active:scale-95 transition-all z-40"
      >
        <Plus size={28} />
      </button>

      {newPlanOpen && <NewPlanDialog onCreated={loadPlans} />}
    </div>
  )
}
