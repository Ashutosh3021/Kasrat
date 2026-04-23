import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

export default function EditGraphPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(decodeURIComponent(name ?? ''))

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-md flex justify-between items-center px-4 h-14 border-b border-[#353437]">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-white hover:bg-[#1b1b1d] rounded-full">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">Edit Graph</h1>
        <div className="w-10" />
      </header>
      <main className="px-4 py-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#c2c6d6] px-1">Display Name</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="bg-[#1b1b1d] text-white text-[17px] rounded-lg p-3 w-full border border-transparent focus:border-[#adc6ff] focus:outline-none"
          />
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-[#adc6ff] text-[#002e6a] rounded-lg min-h-[48px] flex justify-center items-center font-semibold text-[15px] w-full"
        >
          Save
        </button>
      </main>
    </div>
  )
}
