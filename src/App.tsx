import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import WorkoutBubble from './components/WorkoutBubble'
import { useSettingsStore } from './store/settingsStore'
import { useAuthStore } from './store/authStore'
import { seedDatabase } from './db/defaults'
import { supabase } from './supabase/client'
import { syncToSupabase } from './supabase/sync'

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
  '/login',
  '/onboarding',
  '/quick-workout',
]

const PUBLIC_PATHS = ['/login', '/onboarding']

const hasSupabase =
  !!import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  import.meta.env.VITE_SUPABASE_URL !== 'undefined'

async function checkOnboarding(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { loadSettings } = useSettingsStore()
  const { setSession, setLoading, loading } = useAuthStore()

  // Keep a live ref to location.pathname so the auth listener always reads
  // the current path, not the stale closure value from mount time.
  const pathnameRef = useRef(location.pathname)
  useEffect(() => { pathnameRef.current = location.pathname }, [location.pathname])

  useEffect(() => {
    seedDatabase()
    loadSettings()

    // ── Auth state listener ───────────────────────────────────────────────
    // Set up BEFORE any navigation so we catch the OAuth SIGNED_IN event
    // that fires when Supabase exchanges the tokens from the redirect URL.
    //
    // Event sequence on Google OAuth:
    //   1. User clicks "Continue with Google" → browser navigates to Google
    //   2. Google redirects back to redirectTo URL
    //   3. Supabase JS detects the access_token in the URL hash/query
    //   4. onAuthStateChange fires with event = 'SIGNED_IN'
    //   5. We navigate to '/' or '/onboarding'
    //
    // Event sequence on normal page load (already logged in):
    //   1. onAuthStateChange fires with event = 'INITIAL_SESSION', session = existing
    //   2. setLoading(false) — spinner disappears, app renders
    //
    // Event sequence on page load (not logged in):
    //   1. onAuthStateChange fires with event = 'INITIAL_SESSION', session = null
    //   2. setLoading(false), redirect to /login if Supabase is configured

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)

        if (event === 'INITIAL_SESSION') {
          setLoading(false)
          if (!session && hasSupabase) {
            const isPublic = PUBLIC_PATHS.some(p => pathnameRef.current.startsWith(p))
            if (!isPublic) {
              navigate('/login', { replace: true })
            }
          }
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // Use the live ref so we always have the current path, not the
          // stale closure value from when the effect was first registered.
          const currentPath = pathnameRef.current
          const shouldRedirect =
            currentPath.startsWith('/login') ||
            currentPath === '/' ||
            currentPath === ''

          if (shouldRedirect) {
            const done = await checkOnboarding(session.user.id)
            navigate(done ? '/' : '/onboarding', { replace: true })
          }

          if (navigator.onLine) {
            syncToSupabase(session.user.id).catch(console.warn)
          }
          return
        }

        if (event === 'SIGNED_OUT' && hasSupabase) {
          navigate('/login', { replace: true })
        }
      }
    )

    // ── Online: trigger background sync ──────────────────────────────────
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#151515] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#93032E] flex items-center justify-center" style={{ borderRadius: '4px' }}>
            <span className="text-[28px] font-black text-white italic leading-none">K</span>
          </div>
          <div className="w-6 h-6 border-2 border-[#93032E] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#151515] text-white">
      <Outlet />
      {!hideNav && <BottomNav />}
      <WorkoutBubble />
    </div>
  )
}
