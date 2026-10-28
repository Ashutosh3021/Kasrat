import { useState } from 'react'
import Toggle from '../components/Toggle'

interface Props { onClose: () => void }

const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']

export default function GraphsFilter({ onClose }: Props) {
  const [selected, setSelected] = useState('All')
  const [includeCardio, setIncludeCardio] = useState(true)

  return (
    <div className="fixed inset-0 bg-ground/80 backdrop-blur-sm z-[60] animate-fadeIn" onClick={onClose}>
      <div
        className="fixed bottom-0 left-0 w-full h-[45%] bg-surface z-[70] rounded-t-xl border-t border-line flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-line rounded-full mx-auto my-3" />
        <div className="px-3 pb-3 flex justify-center border-b border-line">
          <h2 className="text-[24px] font-semibold text-ink">Filter Graphs</h2>
        </div>
        <div className="flex-grow overflow-y-auto px-3 py-3 space-y-6">
          <section>
            <div className="flex overflow-x-auto gap-2 pb-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setSelected(c)}
                  className={`shrink-0 px-3 py-2 rounded-lg font-semibold text-[15px] transition-colors ${
                    selected === c ? 'bg-accent text-ink' : 'bg-line text-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
          <section className="flex justify-between items-center py-2">
            <span className="text-[16px] text-ink">Include Cardio</span>
            <Toggle checked={includeCardio} onChange={setIncludeCardio} />
          </section>
        </div>
        <div className="p-3 bg-surface border-t border-line">
          <button
            onClick={onClose}
            className="w-full h-12 bg-accent text-ink font-semibold text-[15px] rounded-lg active:scale-[0.98] transition-transform"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
