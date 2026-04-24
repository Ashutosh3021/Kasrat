import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import WorkoutBubble from './components/WorkoutBubble'
import { useSettingsStore } from './store/settingsStore'
import { seedDatabase } from './db/defaults'

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
  '/body-measurements',
  '/stats',
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
      {/* Floating workout bubble — visible on all pages except the session itself */}
      <WorkoutBubble />
    </div>
  )
}
