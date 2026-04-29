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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-[#151515]/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#1C1C1E] p-3 border border-[#2C2C2E]" style={{ borderRadius: '4px' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[22px] font-medium text-white">New Plan</h2>
          <button onClick={closeNewPlan} className="p-2 hover:bg-[#2C2C2E] transition-colors" style={{ borderRadius: '2px' }}>
            <X size={20} strokeWidth={1.5} className="text-white" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#A1A1A6]">Plan Name</label>
            <input
              autoFocus
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && create()}
              className="w-full bg-[#1C1C1E] border border-white px-3 py-3 text-white focus:ring-2 focus:ring-[#93032E] focus:border-transparent outline-none transition-all placeholder:text-[#A1A1A6] text-[17px]"
              style={{ borderRadius: '2px' }}
              placeholder="e.g., Push Day"
            />
            {error && <p className="text-[#FF453A] text-[13px]">{error}</p>}
          </div>
          <div className="flex flex-row gap-3 pt-4">
            <button
              onClick={closeNewPlan}
              className="flex-1 h-12 border border-white text-white font-medium text-[15px] hover:bg-white/10 active:scale-95 transition-all"
              style={{ borderRadius: '2px' }}
            >
              Cancel
            </button>
            <button
              onClick={create}
              className="flex-1 h-12 bg-[#93032E] text-white font-medium text-[15px] hover:opacity-90 active:scale-95 transition-all"
              style={{ borderRadius: '2px' }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
