import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Trash2 } from 'lucide-react'
import TopBar from '../components/TopBar'
import { db, type GymSet } from '../db/database'
import { groupByDate, formatTime } from '../utils/dateUtils'
import { useUIStore } from '../store/uiStore'
import DeleteConfirmation from '../overlays/DeleteConfirmation'
import HistoryFilters from '../overlays/HistoryFilters'
import { deleteGymSet } from '../supabase/writeSync'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [sets, setSets] = useState<GymSet[]>([])
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const { openDeleteConfirm, deleteConfirmOpen, deleteConfirmTarget, closeDeleteConfirm } = useUIStore()

  async function loadSets() {
    const all = await db.gym_sets.orderBy('created').reverse().toArray()
    setSets(all)
  }

  useEffect(() => { loadSets() }, [])

  const filtered = sets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
  const grouped = groupByDate(filtered)

  async function handleDelete() {
    if (deleteConfirmTarget) {
      await deleteGymSet(deleteConfirmTarget.id)
      closeDeleteConfirm()
      loadSets()
    }
  }

  return (
    <div className="min-h-screen bg-[#151515] pb-24 pt-14">
      <TopBar />
      <main className="px-4 pt-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-white">History</h1>
        </div>

        <div className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] text-white pl-10 pr-3 py-3 text-[17px] focus:border-[#93032E] focus:outline-none placeholder:text-zinc-500"
              style={{ borderRadius: '2px' }}
              placeholder="Search workouts..."
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 text-zinc-400 hover:text-white"
            style={{ borderRadius: '2px' }}
          >
            <Filter size={20} strokeWidth={1.5} />
          </button>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#A1A1A6] text-[15px]">No history yet. Start logging sets!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, items]) => (
              <section key={date}>
                <h2 className="text-[22px] font-medium text-white mb-4 border-b border-[#2C2C2E] pb-2">{date}</h2>
                <div className="bg-[#1C1C1E] border border-[#2C2C2E] overflow-hidden" style={{ borderRadius: '4px' }}>
                  {(items as GymSet[]).map((s, i) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 hover:bg-[#2a2a2c] transition-colors cursor-pointer ${i < items.length - 1 ? 'border-b border-[#2C2C2E]' : ''}`}
                    >
                      <button
                        onClick={() => navigate(`/edit-set/${s.id}`)}
                        className="flex flex-col text-left flex-1"
                      >
                        <span className="text-[17px] text-white font-medium">{s.name}</span>
                        <span className="text-[13px] font-medium text-zinc-400">
                          {s.cardio ? `${s.distance} ${s.unit} · ${s.duration}s` : `${s.weight} ${s.unit} × ${s.reps} reps`}
                        </span>
                      </button>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] text-zinc-500">{formatTime(s.created)}</span>
                        <button
                          onClick={() => openDeleteConfirm({ type: 'set', id: s.id!, name: s.name })}
                          className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {deleteConfirmOpen && (
        <DeleteConfirmation
          target={deleteConfirmTarget!}
          onConfirm={handleDelete}
          onCancel={closeDeleteConfirm}
        />
      )}
      {filterOpen && <HistoryFilters onClose={() => setFilterOpen(false)} />}
    </div>
  )
}
