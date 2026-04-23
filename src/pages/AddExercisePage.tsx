import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { db } from '../db/database'

const CATEGORIES = ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core', 'Cardio']

export default function AddExercisePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState<'strength' | 'cardio'>('strength')
  const [category, setCategory] = useState('Chest')
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) { setError('Exercise name is required'); return }
    await db.gym_sets.add({
      name: name.trim(),
      reps: 0,
      weight: 0,
      unit: type === 'cardio' ? 'km' : 'kg',
      created: new Date().toISOString(),
      hidden: true,
      bodyWeight: false,
      duration: 0,
      distance: 0,
      cardio: type === 'cardio',
      restMs: 0,
      notes: category
    })
    navigate(-1)
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 h-14 shrink-0 bg-black/80 backdrop-blur-md z-20">
        <button onClick={() => navigate(-1)} className="text-white p-2 -ml-2 hover:opacity-80">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">New Exercise</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-[200px]">
        <div className="bg-[#1b1b1d] rounded-lg p-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#c2c6d6]">Exercise Name</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              className="w-full bg-[#1b1b1d] border border-[#424754] rounded-lg p-3 text-[17px] text-white placeholder-[#8c909f] focus:border-[#4d8eff] focus:outline-none"
              placeholder="e.g., Barbell Bench Press"
            />
            {error && <p className="text-[#ffb4ab] text-[13px]">{error}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#c2c6d6]">Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setType('strength')}
                className={`flex-1 h-12 rounded-xl font-semibold text-[15px] transition-all ${type === 'strength' ? 'bg-[#4d8eff] text-[#00285d]' : 'border border-[#424754] text-white'}`}
              >
                Strength
              </button>
              <button
                onClick={() => setType('cardio')}
                className={`flex-1 h-12 rounded-xl font-semibold text-[15px] transition-all ${type === 'cardio' ? 'bg-[#4d8eff] text-[#00285d]' : 'border border-[#424754] text-white'}`}
              >
                Cardio
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-[#c2c6d6]">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#1b1b1d] border border-[#424754] rounded-lg p-3 text-[17px] text-white appearance-none focus:border-[#4d8eff] focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c2c6d6] pointer-events-none">▾</span>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 w-full flex flex-col z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="bg-black/95 backdrop-blur-md px-4 py-3 border-t border-[#2a2a2c]">
          <button onClick={save} className="w-full h-12 bg-[#4d8eff] text-[#00285d] rounded-xl font-semibold text-[15px]">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
