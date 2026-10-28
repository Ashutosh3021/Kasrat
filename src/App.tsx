import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import WorkoutBubble from './components/WorkoutBubble'
import { useSettingsStore } from './store/settingsStore'
import { useAuthStore } from './store/authStore'
import { useSyncStore } from './store/syncStore'
import { seedDatabase } from './db/defaults'
import { supabase } from './supabase/client'
import { syncToSupabase, clearLocalUserData } from './supabase/sync'
import { clearStaleSession } from './store/workoutStore'
import SyncLoadingScreen from './components/SyncLoadingScreen'
import StreakToast from './components/StreakToast'
import { refreshStreak } from './services/streakService'
import { toLocalDayKey } from './utils/calendarDay'
// ── New feature: PWA install prompt (Feature 10) ──────────────────────────
import PWAInstallBanner from './features/smartphoneCompat/PWAInstallBanner'
import { registerInstallPromptListener, incrementSessionCount } from './features/smartphoneCompat/pwaUtils'

const NO_NAV_PATHS = [
  '/edit-plan/', '/start-plan/', '/add-exercise', '/edit-set/',
  '/settings/appearance', '/settings/timer', '/settings/tabs',
  '/settings/data', '/settings/format', '/about', '/edit-graph/',
  '/body-measurements', '/stats', '/login', '/onboarding', '/quick-workout',
  // New feature pages (Features 8, 12)
  '/progress', '/generate-plan', '/readiness',
]

const PUBLIC_PATHS = ['/login', '/onboarding']

const hasSupabase =
  !!import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  import.meta.env.VITE_SUPABASE_URL !== 'undefined'

async function checkOnboarding(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { loadSettings, settings } = useSettingsStore()
  const { setSession, setLoading, loading } = useAuthStore()

  useEffect(() => {
    const mode = settings.themeMode === 'light' || settings.themeMode === 'pure_black'
      ? settings.themeMode
      : 'dark'
    document.documentElement.dataset.theme = mode
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', mode === 'light' ? '#F2EFE6' : mode === 'pure_black' ? '#000000' : '#0B100E')
  }, [settings.themeMode])

  const pathnameRef = useRef(location.pathname)
  useEffect(() => {
    pathnameRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    seedDatabase()
    loadSettings()
    clearStaleSession() // SESSION-005: clear persisted session if > 12h old
    registerInstallPromptListener() // Feature 10: capture PWA install prompt

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)

        if (event === 'INITIAL_SESSION') {
          if (!session) {
            setLoading(false)
            if (hasSupabase) {
              const isPublic = PUBLIC_PATHS.some(p => pathnameRef.current.startsWith(p))
              if (!isPublic) {
                navigate('/login', { replace: true })
              }
            }
          } else {
            // Session exists — check onboarding BEFORE revealing the app.
            // This handles both OAuth callback (lands on '/') and normal
            // refresh. If user is already deep in the app (e.g. '/graphs'),
            // they've already onboarded — skip the check.
            const currentPath = pathnameRef.current
            const onEntryPoint =
              currentPath === '/' ||
              currentPath === '' ||
              PUBLIC_PATHS.some(p => currentPath.startsWith(p))

            if (onEntryPoint) {
              const done = await checkOnboarding(session.user.id)
              if (!done) navigate('/onboarding', { replace: true })
            }

            setLoading(false)

            // PWA refresh / mobile reopen only fires INITIAL_SESSION, not SIGNED_IN.
            // Pull here so IndexedDB is repopulated when local storage was cleared.
            if (hasSupabase && navigator.onLine) {
              syncToSupabase(session.user.id).catch(console.warn)
            }
          }
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          const currentPath = pathnameRef.current

          // Skip only if user is already deep in the app (e.g. a deep link).
          // OAuth callback lands on '/' → alreadyInApp = false → check runs.
          // Email login comes from '/login' → alreadyInApp = false → check runs.
          // User navigating '/graphs' etc → alreadyInApp = true → skip.
          const alreadyInApp =
            !PUBLIC_PATHS.some(p => currentPath.startsWith(p)) &&
            currentPath !== '/' &&
            currentPath !== ''

          if (!alreadyInApp) {
            const done = await checkOnboarding(session.user.id)
            navigate(done ? '/' : '/onboarding', { replace: true })
          }

          if (navigator.onLine) {
            syncToSupabase(session.user.id).catch(console.warn)
          }
          incrementSessionCount() // Feature 10: track sessions for PWA install prompt
          return
        }

        if (event === 'SIGNED_OUT') {
          useSyncStore.getState().resetSync()
          clearLocalUserData().catch(console.warn)
          if (hasSupabase) navigate('/login', { replace: true })
        }
      }
    )

    function handleOnline() {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) syncToSupabase(session.user.id).catch(console.warn)
      })
    }
    window.addEventListener('online', handleOnline)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hideNav = NO_NAV_PATHS.some(p => location.pathname.startsWith(p))

  useEffect(() => {
    if (!loading) void refreshStreak()
  }, [loading])

  useEffect(() => {
    if (loading) return
    let lastDayKey = toLocalDayKey()
    const onVisible = () => {
      const key = toLocalDayKey()
      if (key !== lastDayKey) {
        lastDayKey = key
        void refreshStreak({ announce: true })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loading])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-ground px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent shadow-[0_18px_40px_-22px_rgba(198,58,25,0.9)]">
            <span className="text-[26px] font-black leading-none tracking-[-0.08em] text-on-accent">K</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[18px] font-extrabold tracking-[-0.04em] text-ink">KASRAT</span>
            <span className="mono text-[9px] uppercase tracking-[0.22em] text-muted">Training log</span>
          </div>
        </div>
        <div className="flex w-36 items-center gap-1.5">
          <span className="h-1 flex-1 rounded-full bg-accent" />
          <span className="h-1 w-9 rounded-full bg-line" />
          <span className="h-1 w-4 rounded-full bg-line" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ground text-ink">
      <SyncLoadingScreen />
      <StreakToast />
      <Outlet />
      {!hideNav && <BottomNav />}
      <WorkoutBubble />
      {/* Feature 10: PWA install prompt banner */}
      <PWAInstallBanner />
    </div>
  )
}
