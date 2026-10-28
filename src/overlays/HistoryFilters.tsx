import { useState } from 'react'

interface Props { onClose: () => void }

export default function HistoryFilters({ onClose }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  return (
    <div className="fixed inset-0 bg-ground/80 backdrop-blur-sm z-[60] animate-fadeIn" onClick={onClose}>
      <div
        className="fixed bottom-0 left-0 w-full bg-surface z-[70] rounded-t-xl border-t border-line flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-line rounded-full mx-auto my-3" />
        <div className="px-3 pb-3 flex justify-center border-b border-line">
          <h2 className="text-[24px] font-semibold text-ink">Filter History</h2>
        </div>
        <div className="px-3 py-3 flex gap-3">
          <div className="flex-1 bg-surface rounded-2xl p-3 border border-line flex items-center gap-2">
            <div className="flex flex-col flex-1">
              <label className="text-[13px] font-medium text-muted mb-0.5">From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="bg-transparent border-none p-0 text-ink text-[16px] focus:ring-0 w-full outline-none"
              />
            </div>
          </div>
          <div className="flex-1 bg-surface rounded-2xl p-3 border border-line flex items-center gap-2">
            <div className="flex flex-col flex-1">
              <label className="text-[13px] font-medium text-muted mb-0.5">To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="bg-transparent border-none p-0 text-ink text-[16px] focus:ring-0 w-full outline-none"
              />
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-line">
          <button onClick={onClose} className="w-full h-12 bg-accent text-ink font-semibold text-[15px] rounded-lg">
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
