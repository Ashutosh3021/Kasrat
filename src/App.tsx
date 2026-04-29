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

  const pathnameRef = useRef(location.pathname)
  useEffect(() => { pathnameRef.current = location.pathname }, [location.pathname])

  useEffect(() => {
    seedDatabase()
    loadSettings()

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
          // Navigate away from any auth-related page on sign-in.
          // This covers:
          //   - Coming back from Google OAuth (lands on / or catches as *)
          //   - Email/password login from /login
          // We always redirect — if they're already on a real page (e.g. deep
          // link), the route stays unchanged because currentPath won't match.
          const currentPath = pathnameRef.current
          const onAuthPage = PUBLIC_PATHS.some(p => currentPath.startsWith(p))
          if (onAuthPage) {
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
