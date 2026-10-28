import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

export default function EditGraphPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(decodeURIComponent(name ?? ''))

  return (
    <div className="min-h-screen bg-ground pb-8">
      <header className="sticky top-0 w-full z-50 bg-ground/90 backdrop-blur-md flex justify-between items-center px-3 h-14 border-b border-line">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-ink hover:bg-surface rounded-lg">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-semibold text-ink absolute left-1/2 -translate-x-1/2">Edit Graph</h1>
        <div className="w-10" />
      </header>
      <main className="px-3 py-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-muted px-1">Display Name</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="bg-surface text-ink text-[16px] rounded-2xl p-3 w-full border border-line focus:border-accent-hover focus:outline-none"
          />
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-accent text-ink rounded-lg min-h-[48px] flex justify-center items-center font-semibold text-[15px] w-full"
        >
          Save
        </button>
      </main>
    </div>
  )
}
