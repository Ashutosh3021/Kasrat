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

  if (tabs.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-safe pt-2">
      <nav
        aria-label="Primary"
        className="pointer-events-auto mx-auto grid w-full max-w-lg gap-1 rounded-[22px] border border-line/90 bg-surface/95 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path))
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex h-[52px] flex-col items-center justify-center gap-1 rounded-[16px] transition-all duration-200 active:scale-[0.96] ${
                isActive
                  ? 'bg-accent text-on-accent shadow-[0_8px_20px_-12px_rgba(198,58,25,0.9)]'
                  : 'text-muted hover:bg-ink/5 hover:text-ink'
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2 : 1.7} />
              <span className={`text-[9px] font-semibold leading-none tracking-[0.04em] ${isActive ? 'text-on-accent' : ''}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
