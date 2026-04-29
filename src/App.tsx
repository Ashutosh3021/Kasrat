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
  '/edit-plan/', '/start-plan/', '/add-exercise', '/edit-set/',
  '/settings/appearance', '/settings/timer', '/settings/tabs',
  '/settings/data', '/settings/format', '/about', '/edit-graph/',
  '/body-measurements', '/stats', '/login', '/onboarding', '/quick-workout',
]

const PUBLIC_PATHS = ['/login', '/onboarding']

const hasSupabase =
  !!import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  import.meta.env.VITE_SUPABASE_URL !== 'undefined'

console.log('[Kasrat:App] hasSupabase:', hasSupabase)
console.log('[Kasrat:App] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ?? '(not set)')

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
  const { loadSettings } = useSettingsStore()
  const { setSession, setLoading, loading } = useAuthStore()

  const pathnameRef = useRef(location.pathname)
  useEffect(() => {
    pathnameRef.current = location.pathname
    console.log('[Kasrat:App] route changed →', location.pathname)
  }, [location.pathname])

  useEffect(() => {
    seedDatabase()
    loadSettings()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Kasrat:auth] event:', event, '| user:', session?.user?.email ?? 'none', '| path:', pathnameRef.current)
        setSession(session)

        if (event === 'INITIAL_SESSION') {
          if (!session) {
            setLoading(false)
            console.log('[Kasrat:auth] INITIAL_SESSION — no session')
            if (hasSupabase) {
              const isPublic = PUBLIC_PATHS.some(p => pathnameRef.current.startsWith(p))
              if (!isPublic) {
                console.log('[Kasrat:auth] → redirecting to /login')
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

            console.log('[Kasrat:auth] INITIAL_SESSION — session found | path:', currentPath, '| onEntryPoint:', onEntryPoint)

            if (onEntryPoint) {
              const done = await checkOnboarding(session.user.id)
              console.log('[Kasrat:auth] onboarding done:', done)
              if (!done) navigate('/onboarding', { replace: true })
            }

            setLoading(false)
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

          console.log('[Kasrat:auth] SIGNED_IN — alreadyInApp:', alreadyInApp, '| currentPath:', currentPath)

          if (!alreadyInApp) {
            const done = await checkOnboarding(session.user.id)
            console.log('[Kasrat:auth] onboarding done:', done, '→ navigating to', done ? '/' : '/onboarding')
            navigate(done ? '/' : '/onboarding', { replace: true })
          }

          if (navigator.onLine) {
            syncToSupabase(session.user.id).catch(console.warn)
          }
          return
        }

        if (event === 'SIGNED_OUT') {
          console.log('[Kasrat:auth] SIGNED_OUT — hasSupabase:', hasSupabase)
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
