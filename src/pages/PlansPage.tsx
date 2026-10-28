import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Trash2 } from 'lucide-react'
import TopBar from '../components/TopBar'
import DayPills from '../components/DayPills'
import { db, type Plan } from '../db/database'
import { useUIStore } from '../store/uiStore'
import NewPlanDialog from '../overlays/NewPlanDialog'
import { deletePlan as deletePlanSync } from '../supabase/writeSync'
import { useOnSyncComplete } from '../hooks/useOnSyncComplete'

interface ConfirmState {
  type: 'plan'
  plan: Plan
}

export default function PlansPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const { openNewPlan, newPlanOpen } = useUIStore()

  const loadPlans = useCallback(async () => {
    const p = await db.plans.orderBy('sequence').toArray()
    setPlans(p)
  }, [])

  useEffect(() => { loadPlans() }, [loadPlans])
  useOnSyncComplete(loadPlans)

  async function deletePlan(plan: Plan) {
    await deletePlanSync(plan.id!)
    setConfirm(null)
    loadPlans()
  }

  return (
    <div className="min-h-screen bg-ground pb-32 pt-14">
      <TopBar />
      <main className="px-4 pt-6 max-w-md mx-auto flex flex-col gap-4">
        <h1 className="text-[40px] font-semibold leading-10 tracking-tight text-ink">Plans</h1>

        {/* Feature 12: AI plan generator entry point */}
        <button
          onClick={() => navigate('/generate-plan')}
          className="w-full bg-surface border border-line h-11 flex items-center justify-center gap-2 text-accent-soft font-medium text-[15px] hover:border-accent-hover/60 transition-colors"
          style={{ borderRadius: '10px' }}
        >
          Generate Plan
        </button>

        {plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-[15px]">No plans yet. Create your first plan!</p>
          </div>
        ) : (
          plans.map(plan => {
            const days = plan.days.split(',').map(Number).filter(n => !isNaN(n))
            const exCount = plan.exercises.split(',').filter(Boolean).length
            return (
              <article
                key={plan.id}
                className="bg-surface border border-line p-3 flex flex-col gap-3 relative overflow-hidden"
                style={{ borderRadius: '16px' }}
              >
                <div className="flex justify-between items-start">
                  <button
                    className="flex-1 text-left"
                    onClick={() => navigate(`/edit-plan/${plan.id}`)}
                  >
                    <h2 className="text-[24px] font-medium text-ink">{plan.title}</h2>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setConfirm({ type: 'plan', plan })}
                      className="p-2 text-muted hover:text-danger transition-colors"
                      aria-label="Delete plan"
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => navigate(`/edit-plan/${plan.id}`)}
                      className="p-2 text-muted hover:text-ink transition-colors"
                      aria-label="Edit plan"
                    >
                      <ChevronRight size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <DayPills activeDays={days} readonly />
                <div className="flex items-center gap-1.5 text-muted">
                  <span className="text-[13px] font-medium">{exCount} exercises</span>
                </div>
              </article>
            )
          })
        )}
      </main>

      <button
        onClick={openNewPlan}
        className="fixed bottom-20 right-4 w-14 h-14 bg-accent text-ink flex items-center justify-center active:scale-95 transition-all z-40"
        style={{ borderRadius: '10px' }}
      >
        <Plus size={28} strokeWidth={1.5} />
      </button>

      {newPlanOpen && <NewPlanDialog onCreated={loadPlans} />}

      {/* Delete plan confirmation */}
      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ground/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-surface border border-line p-4 flex flex-col gap-4" style={{ borderRadius: '16px' }}>
            <h3 className="text-[16px] font-semibold text-ink">Delete Plan</h3>
            <p className="text-[15px] text-muted">
              Delete <span className="text-ink font-medium">"{confirm.plan.title}"</span>? All exercises and settings will be permanently removed. Logged sets are kept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 h-11 border border-line text-ink font-medium text-[15px]"
                style={{ borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => deletePlan(confirm.plan)}
                className="flex-1 h-11 bg-danger-fill text-ink font-medium text-[15px] flex items-center justify-center gap-2"
                style={{ borderRadius: '10px' }}
              >
                <Trash2 size={16} strokeWidth={1.5} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
