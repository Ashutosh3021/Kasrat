import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { useSettingsStore } from './store/settingsStore'
import { seedDatabase } from './db/defaults'

// Pages that should NOT show the bottom nav
const NO_NAV_PATHS = [
  '/edit-plan/',
  '/start-plan/',
  '/add-exercise',
  '/edit-set/',
  '/settings/appearance',
  '/settings/timer',
  '/settings/tabs',
  '/settings/data',
  '/settings/format',
  '/about',
  '/edit-graph/',
]

export default function App() {
  const location = useLocation()
  const { loadSettings } = useSettingsStore()

  useEffect(() => {
    seedDatabase()
    loadSettings()
  }, [loadSettings])

  const hideNav = NO_NAV_PATHS.some(p => location.pathname.startsWith(p))

  return (
    <div className="min-h-screen bg-black text-white">
      <Outlet />
      {!hideNav && <BottomNav />}
    </div>
  )
}
