import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BarChart2, ClipboardList, History, Timer } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

const ALL_TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/' },
  { key: 'graphs', label: 'Graphs', icon: BarChart2, path: '/graphs' },
  { key: 'plans', label: 'Plans', icon: ClipboardList, path: '/plans' },
  { key: 'history', label: 'History', icon: History, path: '/history' },
  { key: 'timer', label: 'Timer', icon: Timer, path: '/timer' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const hidden = settings.hiddenTabs ? settings.hiddenTabs.split(',') : []
  const tabs = ALL_TABS.filter(t => !hidden.includes(t.key))

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-safe bg-black border-t border-[#2C2C2E] h-16">
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path))
        const Icon = tab.icon
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center w-16 h-full rounded-lg transition-all duration-200 ${isActive ? 'text-[#3B82F6] scale-95' : 'text-zinc-500 hover:bg-zinc-900/50'}`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium tracking-tight mt-1">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
