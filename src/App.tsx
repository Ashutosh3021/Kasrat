import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import WorkoutBubble from './components/WorkoutBubble'
import { useSettingsStore } from './store/settingsStore'
import { useAuthStore } from './store/authStore'
import { seedDatabase } from './db/defaults'
import { supabase } from './supabase/client'
import { pullRemoteData, processSyncQueue, setupOnlineListener } from './hooks/useSync'

const NO_NAV_PATHS = [
  '/edit-plan/', '/start-plan/', '/add-exercise', '/edit-set/',
  '/settings/appearance', '/settings/timer', '/settings/tabs',
  '/settings/data', '/settings/format', '/settings/security', '/about', '/edit-graph/',
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
    const { data } = await supabase
      .from('profiles').select('id').eq('id', userId).maybeSingle()
    return !!data
  } catch {
    return false
  }
}

// ─── Sync loader overlay ──────────────────────────────────────────────────────
function SyncLoader({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[200] bg-[#151515] flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 bg-[#93032E] flex items-center justify-center" style={{ borderRadius: '4px' }}>
        <span className="text-[28px] font-black text-white italic leading-none">K</span>
      </div>
      <div className="flex flex-col items-center gap-3 w-48">
        <div className="w-full h-1 bg-[#2C2C2E] overflow-hidden" style={{ borderRadius: '2px' }}>
          <div className="h-full bg-[#BE1755] animate-pulse" style={{ width: '60%', borderRadius: '2px' }} />
        </div>
        <p className="text-[13px] font-medium text-[#A1A1A6]">{label}</p>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { loadSettings } = useSettingsStore()
  const { setSession, setLoading, loading } = useAuthStore()
  const [syncing, setSyncing] = useState(false)
  const [syncLabel, setSyncLabel] = useState('Syncing your data…')

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
        console.log('[Kasrat:auth] event:', event,
          '| user:', session?.user?.email ?? 'none',
          '| path:', pathnameRef.current)
        setSession(session)

        // ── INITIAL_SESSION ───────────────────────────────────────────────
        if (event === 'INITIAL_SESSION') {
          setLoading(false)
          if (!session) {
            if (hasSupabase) {
              const isPublic = PUBLIC_PATHS.some(p => pathnameRef.current.startsWith(p))
              if (!isPublic) {
                console.log('[Kasrat:auth] → redirecting to /login')
                navigate('/login', { replace: true })
              }
            }
          } else {
            // Already logged in — pull fresh data in background (no blocking loader)
            if (navigator.onLine) {
              processSyncQueue(session.user.id).catch(console.warn)
            }
          }
          return
        }

        // ── SIGNED_IN ─────────────────────────────────────────────────────
        if (event === 'SIGNED_IN' && session?.user) {
          const currentPath = pathnameRef.current
          const onAuthPage = PUBLIC_PATHS.some(p => currentPath.startsWith(p))

          if (onAuthPage) {
            // Check if profile exists → determines onboarding vs home
            const done = await checkOnboarding(session.user.id)
            console.log('[Kasrat:auth] onboarding done:', done)

            if (done) {
              // Profile exists — pull remote data with visible loader
              if (navigator.onLine) {
                setSyncLabel('Syncing your data…')
                setSyncing(true)
                try {
                  await processSyncQueue(session.user.id)
                  await pullRemoteData(session.user.id)
                } catch (err) {
                  console.warn('[Kasrat:auth] sync on login failed:', err)
                } finally {
                  setSyncing(false)
                }
              }
              navigate('/', { replace: true })
            } else {
              // New user — go to onboarding (no pull needed)
              navigate('/onboarding', { replace: true })
            }
          }

          // Set up online listener for this session
          const cleanup = setupOnlineListener(session.user.id)
          // Store cleanup on window so it can be called on logout
          ;(window as Window & { _syncCleanup?: () => void })._syncCleanup = cleanup
          return
        }

        // ── SIGNED_OUT ────────────────────────────────────────────────────
        if (event === 'SIGNED_OUT') {
          console.log('[Kasrat:auth] SIGNED_OUT')
          // Remove online listener
          const w = window as Window & { _syncCleanup?: () => void }
          if (w._syncCleanup) { w._syncCleanup(); delete w._syncCleanup }
          if (hasSupabase) navigate('/login', { replace: true })
        }
      }
    )

    return () => { subscription.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hideNav = NO_NAV_PATHS.some(p => location.pathname.startsWith(p))

  // Auth loading spinner (checking session on startup)
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
      {syncing && <SyncLoader label={syncLabel} />}
      <Outlet />
      {!hideNav && <BottomNav />}
      <WorkoutBubble />
    </div>
  )
}
