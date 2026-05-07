import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Trash2 } from 'lucide-react'
import TopBar from '../components/TopBar'
import { db, type GymSet } from '../db/database'
import { groupByDate, formatTime } from '../utils/dateUtils'
import { useUIStore } from '../store/uiStore'
import DeleteConfirmation from '../overlays/DeleteConfirmation'
import HistoryFilters from '../overlays/HistoryFilters'
import { deleteGymSet } from '../supabase/writeSync'

// PERF-001: page size — load 60 sets at a time
const PAGE_SIZE = 60

// Simple debounce hook — waits `delay` ms after the last change
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [sets, setSets] = useState<GymSet[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const { openDeleteConfirm, deleteConfirmOpen, deleteConfirmTarget, closeDeleteConfirm } = useUIStore()

  // Debounce search so we don't query on every keystroke
  const debouncedSearch = useDebounce(search, 300)

  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadSets = useCallback(async (pageNum: number, query: string, replace: boolean) => {
    let results: GymSet[]

    if (query.trim()) {
      // Dexie doesn't have a native case-insensitive contains index,
      // so we fetch all matching by name prefix using the name index,
      // then filter client-side. For exact substring we still need filter()
      // but we limit the scan to the name-indexed collection.
      const all = await db.gym_sets
        .orderBy('created')
        .reverse()
        .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
        .offset(pageNum * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray()
      results = all
    } else {
      results = await db.gym_sets
        .orderBy('created')
        .reverse()
        .offset(pageNum * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray()
    }

    setHasMore(results.length === PAGE_SIZE)
    setSets(prev => replace ? results : [...prev, ...results])
  }, [])

  // Reset to page 0 whenever search changes
  useEffect(() => {
    setPage(0)
    loadSets(0, debouncedSearch, true)
  }, [debouncedSearch, loadSets])

  // Load next page when page increments (not on initial load)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (page > 0) loadSets(page, debouncedSearch, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          setPage(p => p + 1)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore])

  const grouped = groupByDate(sets)

  async function handleDelete() {
    if (deleteConfirmTarget) {
      await deleteGymSet(deleteConfirmTarget.id)
      closeDeleteConfirm()
      // Reload from scratch after delete
      setPage(0)
      loadSets(0, debouncedSearch, true)
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
            <p className="text-[#A1A1A6] text-[15px]">
              {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No history yet. Start logging sets!'}
            </p>
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

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            {!hasMore && sets.length > 0 && (
              <p className="text-center text-[13px] text-[#424754] pb-4">All sets loaded</p>
            )}
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
