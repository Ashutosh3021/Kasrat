import { useState } from 'react'
import { X } from 'lucide-react'
import { db } from '../db/database'
import { useUIStore } from '../store/uiStore'

interface Props { onCreated: () => void }

export default function NewPlanDialog({ onCreated }: Props) {
  const { closeNewPlan } = useUIStore()
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  async function create() {
    if (!title.trim()) { setError('Plan name is required'); return }
    const count = await db.plans.count()
    await db.plans.add({ sequence: count, title: title.trim(), exercises: '', days: '' })
    closeNewPlan()
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#1C1C1E] rounded-xl p-6 border border-[#2C2C2E] shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[22px] font-semibold text-white">New Plan</h2>
          <button onClick={closeNewPlan} className="p-2 hover:bg-[#2C2C2E] rounded-full transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#c2c6d6]">Plan Name</label>
            <input
              autoFocus
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && create()}
              className="w-full bg-[#1C1C1E] border border-white rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-[#4d8eff] focus:border-transparent outline-none transition-all placeholder:text-[#424754] text-[17px]"
              placeholder="e.g., Push Day"
            />
            {error && <p className="text-[#ffb4ab] text-[13px]">{error}</p>}
          </div>
          <div className="flex flex-row gap-3 pt-4">
            <button
              onClick={closeNewPlan}
              className="flex-1 h-12 rounded-xl border border-white text-white font-semibold text-[15px] hover:bg-white/10 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={create}
              className="flex-1 h-12 rounded-xl bg-[#4d8eff] text-[#00285d] font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(77,142,255,0.15)]"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
