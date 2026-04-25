import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, GripVertical, RotateCcw } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useDragToReorder } from '../../hooks/useDragToReorder'

const DEFAULT_TABS = [
  { key: 'home', label: 'Home' },
  { key: 'graphs', label: 'Graphs' },
  { key: 'plans', label: 'Plans' },
  { key: 'history', label: 'History' },
  { key: 'timer', label: 'Timer' },
]

type Tab = typeof DEFAULT_TABS[number]

export default function TabSettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettingsStore()
  const hidden = settings.hiddenTabs ? settings.hiddenTabs.split(',').filter(Boolean) : []

  // Derive ordered tabs from persisted tabOrder setting
  const orderedKeys = settings.tabOrder ? settings.tabOrder.split(',').filter(Boolean) : []
  const initialTabs: Tab[] = orderedKeys.length === DEFAULT_TABS.length
    ? orderedKeys.map(k => DEFAULT_TABS.find(t => t.key === k)!).filter(Boolean)
    : DEFAULT_TABS

  const [tabs, setTabs] = useState<Tab[]>(initialTabs)

  function handleReorder(newTabs: Tab[]) {
    setTabs(newTabs)
    updateSetting('tabOrder', newTabs.map(t => t.key).join(','))
  }

  const { getHandleProps, getItemProps } = useDragToReorder(tabs, handleReorder)

  function toggleTab(key: string) {
    const newHidden = hidden.includes(key)
      ? hidden.filter(h => h !== key)
      : [...hidden, key]
    updateSetting('hiddenTabs', newHidden.join(','))
  }

  function reset() {
    updateSetting('hiddenTabs', '')
    updateSetting('tabOrder', '')
    setTabs(DEFAULT_TABS)
  }

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-[390px] min-h-screen bg-black relative flex flex-col">
        <nav className="fixed top-0 left-0 w-full z-50 border-b border-neutral-900 bg-black flex items-center justify-between h-14 px-3 sm:max-w-[390px] sm:left-1/2 sm:-translate-x-1/2">
          <button onClick={() => navigate(-1)} className="text-[#3B82F6] hover:text-blue-400 p-2 -ml-2 rounded-[2px]">
            <ArrowLeft size={22} strokeWidth={1.5} />
          </button>
          <div className="text-xl font-black italic tracking-tighter text-[#3B82F6] uppercase">KASRAT</div>
          <div className="w-10" />
        </nav>

        <main className="flex-1 pt-[72px] pb-safe flex flex-col">
          <header className="px-3 mb-8">
            <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-white">Tab Settings</h1>
            <p className="text-[17px] text-[#A1A1A6] mt-2 max-w-[90%]">Toggle tabs to show or hide them. Drag to reorder.</p>
          </header>

          <div className="px-3 flex flex-col gap-3 flex-1" data-drag-list>
            {tabs.map((tab, i) => {
              const isHidden = hidden.includes(tab.key)
              return (
                <div
                  key={tab.key}
                  className={`bg-[#1C1C1E] rounded-[4px] p-3 flex items-center justify-between border border-[#2C2C2E] transition-colors ${isHidden ? 'opacity-60' : ''}`}
                  {...getItemProps(i)}
                >
                  <div className="flex items-center gap-3">
                    <span {...getHandleProps(i)}>
                      <GripVertical size={20} strokeWidth={1.5} className="text-[#A1A1A6]" />
                    </span>
                    <span className={`text-[17px] font-medium ${isHidden ? 'text-[#A1A1A6] line-through' : 'text-white'}`}>{tab.label}</span>
                  </div>
                  <button
                    onClick={() => toggleTab(tab.key)}
                    className="w-10 h-10 rounded-[2px] flex items-center justify-center hover:bg-[#2C2C2E] transition-colors text-[#3B82F6]"
                  >
                    {isHidden ? <EyeOff size={20} strokeWidth={1.5} className="text-[#A1A1A6]" /> : <Eye size={20} strokeWidth={1.5} />}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="px-3 pb-8 pt-8 mt-auto">
            <button
              onClick={reset}
              className="w-full h-12 rounded-[2px] border border-[#3B82F6] text-[#3B82F6] font-semibold text-[15px] flex items-center justify-center gap-2 hover:bg-[#2C2C2E] transition-colors"
            >
              <RotateCcw size={18} strokeWidth={1.5} />
              Reset to default
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
