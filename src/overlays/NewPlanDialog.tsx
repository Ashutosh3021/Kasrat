import { useState } from 'react'
import { X } from 'lucide-react'
import { db } from '../db/database'
import { useUIStore } from '../store/uiStore'
import { addPlan } from '../supabase/writeSync'

interface Props { onCreated: () => void }

export default function NewPlanDialog({ onCreated }: Props) {
  const { closeNewPlan } = useUIStore()
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  async function create() {
    if (!title.trim()) { setError('Plan name is required'); return }
    const count = await db.plans.count()
    await addPlan({ sequence: count, title: title.trim(), exercises: '', days: '' })
    closeNewPlan()
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-ground/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-surface p-3 border border-line" style={{ borderRadius: '16px' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[24px] font-medium text-ink">New Plan</h2>
          <button onClick={closeNewPlan} className="p-2 hover:bg-line transition-colors" style={{ borderRadius: '10px' }}>
            <X size={20} strokeWidth={1.5} className="text-ink" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-muted">Plan Name</label>
            <input
              autoFocus
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && create()}
              className="w-full bg-surface border border-ink px-3 py-3 text-ink focus:ring-2 focus:ring-accent-soft focus:border-transparent outline-none transition-all placeholder:text-muted text-[16px]"
              style={{ borderRadius: '10px' }}
              placeholder="e.g., Push Day"
            />
            {error && <p className="text-danger text-[13px]">{error}</p>}
          </div>
          <div className="flex flex-row gap-3 pt-4">
            <button
              onClick={closeNewPlan}
              className="flex-1 h-12 border border-ink text-ink font-medium text-[15px] hover:bg-ink/10 active:scale-95 transition-all"
              style={{ borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              onClick={create}
              className="flex-1 h-12 bg-accent text-ink font-medium text-[15px] hover:opacity-90 active:scale-95 transition-all"
              style={{ borderRadius: '10px' }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
