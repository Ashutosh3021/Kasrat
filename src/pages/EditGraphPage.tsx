import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

export default function EditGraphPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(decodeURIComponent(name ?? ''))

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-md flex justify-between items-center px-3 h-14 border-b border-[#2C2C2E]">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-white hover:bg-[#1C1C1E] rounded-[2px]">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">Edit Graph</h1>
        <div className="w-10" />
      </header>
      <main className="px-3 py-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#A1A1A6] px-1">Display Name</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="bg-[#1C1C1E] text-white text-[17px] rounded-[4px] p-3 w-full border border-[#2C2C2E] focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-[#3B82F6] text-white rounded-[2px] min-h-[48px] flex justify-center items-center font-semibold text-[15px] w-full"
        >
          Save
        </button>
      </main>
    </div>
  )
}
