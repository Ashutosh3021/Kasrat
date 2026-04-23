import { useState } from 'react'

interface Props { onClose: () => void }

export default function HistoryFilters({ onClose }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] animate-fadeIn" onClick={onClose}>
      <div
        className="fixed bottom-0 left-0 w-full bg-[#1C1C1E] z-[70] rounded-t-xl border-t border-[#2C2C2E] flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-[#2C2C2E] rounded-full mx-auto my-3" />
        <div className="px-4 pb-4 flex justify-center border-b border-[#2C2C2E]">
          <h2 className="text-[22px] font-semibold text-white">Filter History</h2>
        </div>
        <div className="px-4 py-4 flex gap-3">
          <div className="flex-1 bg-[#1b1b1d] rounded-lg p-3 border border-[#424754] flex items-center gap-2">
            <span className="text-lg">📅</span>
            <div className="flex flex-col flex-1">
              <label className="text-[13px] font-medium text-[#c2c6d6] mb-0.5">From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="bg-transparent border-none p-0 text-white text-[17px] focus:ring-0 w-full outline-none"
              />
            </div>
          </div>
          <div className="flex-1 bg-[#1b1b1d] rounded-lg p-3 border border-[#424754] flex items-center gap-2">
            <span className="text-lg">📅</span>
            <div className="flex flex-col flex-1">
              <label className="text-[13px] font-medium text-[#c2c6d6] mb-0.5">To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="bg-transparent border-none p-0 text-white text-[17px] focus:ring-0 w-full outline-none"
              />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-[#2C2C2E]">
          <button onClick={onClose} className="w-full h-12 bg-[#4d8eff] text-[#00285d] font-semibold text-[15px] rounded-xl">
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
