import { useState } from 'react'
import Toggle from '../components/Toggle'

interface Props { onClose: () => void }

const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']

export default function GraphsFilter({ onClose }: Props) {
  const [selected, setSelected] = useState('All')
  const [includeCardio, setIncludeCardio] = useState(true)

  return (
    <div className="fixed inset-0 bg-[#151515]/80 backdrop-blur-sm z-[60] animate-fadeIn" onClick={onClose}>
      <div
        className="fixed bottom-0 left-0 w-full h-[45%] bg-[#1C1C1E] z-[70] rounded-t-xl border-t border-[#2C2C2E] flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-[#2C2C2E] rounded-full mx-auto my-3" />
        <div className="px-3 pb-3 flex justify-center border-b border-[#2C2C2E]">
          <h2 className="text-[22px] font-semibold text-white">Filter Graphs</h2>
        </div>
        <div className="flex-grow overflow-y-auto px-3 py-3 space-y-6">
          <section>
            <div className="flex overflow-x-auto gap-2 pb-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setSelected(c)}
                  className={`shrink-0 px-3 py-2 rounded-[2px] font-semibold text-[15px] transition-colors ${
                    selected === c ? 'bg-[#93032E] text-white' : 'bg-[#2C2C2E] text-[#A1A1A6]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
          <section className="flex justify-between items-center py-2">
            <span className="text-[17px] text-white">Include Cardio</span>
            <Toggle checked={includeCardio} onChange={setIncludeCardio} />
          </section>
        </div>
        <div className="p-3 bg-[#1C1C1E] border-t border-[#2C2C2E]">
          <button
            onClick={onClose}
            className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] rounded-[2px] active:scale-[0.98] transition-transform"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
