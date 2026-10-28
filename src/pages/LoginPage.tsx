import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../supabase/client'

type Tab = 'login' | 'signup'

const env = (value?: string) =>
  value && value !== 'undefined' ? value : undefined

function getOAuthRedirectTo(): string {
  const configured = env(import.meta.env.VITE_SUPABASE_REDIRECT_URL)
  const base = configured
    ?? (import.meta.env.DEV
      ? `${window.location.origin}/Kasrat`
      : 'https://ashutosh3021.github.io/Kasrat')
  return base.replace(/[/#]+$/, '') + '/'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Guard: if already authenticated, redirect to home
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate('/', { replace: true })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkOnboarding(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
      return !!data
    } catch {
      return false
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (tab === 'login') await handleLogin()
    else await handleSignUp()
  }

  async function handleLogin() {
    setError(''); setInfo('')
    if (!email.trim() || !password) { setError('Email and password are required'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    const done = await checkOnboarding(data.user.id)
    navigate(done ? '/' : '/onboarding', { replace: true })
  }

  async function handleSignUp() {
    setError(''); setInfo('')
    if (!email.trim() || !password) { setError('Email and password are required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    if (data.user && !data.session) {
      setInfo('Check your email to confirm your account, then log in.')
      return
    }
    navigate('/onboarding', { replace: true })
  }

  async function handleGoogle() {
    setError('')
    // KEY FIX: skipBrowserRedirect: true
    // Without this, Supabase internally calls history.pushState() or
    // modifies window.location.hash BEFORE the full redirect happens.
    // React Router sees that change and tries to match it as a route → 404.
    //
    // With skipBrowserRedirect: true, Supabase just returns the URL.
    // We then use window.location.href = url which is a true full-page
    // navigation that React Router cannot intercept.
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectTo(),
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' }, // always show account picker
      },
    })
    if (err) { setError(err.message); return }
    // window.location.href bypasses React Router entirely.
    // Never use navigate() here — this is an external URL.
    if (data?.url) {
      window.location.href = data.url
    }
  }

  return (
    <div className="min-h-[100dvh] bg-ground lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="hero-panel relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <span className="text-[21px] font-black leading-none tracking-[-0.1em] text-on-accent">K</span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[17px] font-extrabold tracking-[-0.05em] text-ink">KASRAT</span>
            <span className="mono mt-1 text-[8px] uppercase tracking-[0.24em] text-muted">Training log</span>
          </span>
        </div>

        <div className="relative z-10 -mt-6">
          <p className="kicker text-accent-soft">For the work that compounds</p>
          <p className="display-hero mt-6 max-w-[9ch] text-[clamp(4.25rem,6.6vw,7rem)] text-ink">
            Show up.<br />Log it.<br /><span className="text-accent-soft">Repeat.</span>
          </p>
          <p className="mt-7 max-w-[34ch] text-[14px] leading-relaxed text-muted">
            A quiet place for your sets, plans and progress. No feed, no noise, no performance for anyone but you.
          </p>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4 border-t border-line pt-6">
            {[
              ['01', 'No feed'],
              ['02', 'Every set'],
              ['03', 'Your data'],
            ].map(([n, label]) => (
              <div key={n}>
                <span className="mono text-[10px] tracking-[0.12em] text-accent-soft">{n}</span>
                <p className="mt-1.5 text-[12px] font-medium text-ink-soft">{label}</p>
              </div>
            ))}
          </div>
          <p className="mono mt-7 text-[9px] uppercase tracking-[0.18em] text-muted-dim">
            Built for showing up · Works offline
          </p>
        </div>
      </section>

      <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-[25rem] animate-rise">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <span className="text-[21px] font-black leading-none tracking-[-0.1em] text-on-accent">K</span>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-extrabold tracking-[-0.05em] text-ink">KASRAT</span>
              <span className="mono mt-1 text-[8px] uppercase tracking-[0.24em] text-muted">Training log</span>
            </span>
          </div>

          <div className="card p-6 sm:p-7">
            <p className="kicker">{tab === 'login' ? 'Welcome back' : 'New account'}</p>
            <h1 className="display mt-2 text-[34px] text-ink">
              {tab === 'login' ? 'Get back under the bar.' : 'Start your log.'}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {tab === 'login'
                ? 'Your sessions, plans and history are right where you left them.'
                : 'One account keeps every session, plan and measurement together.'}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-line bg-ground p-1">
              {(['login', 'signup'] as Tab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(''); setInfo('') }}
                  className={`flex h-10 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors ${
                    tab === t ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12px] font-medium leading-snug text-danger">
                {error}
              </p>
            )}
            {info && (
              <p role="status" className="mt-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-[12px] font-medium leading-snug text-success">
                {info}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
              <div className="field">
                <label htmlFor="email" className="field-label">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                />
              </div>

              <div className="field">
                <label htmlFor="password" className="field-label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw
                      ? <EyeOff size={17} strokeWidth={1.7} />
                      : <Eye size={17} strokeWidth={1.7} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary mt-1 w-full"
              >
                {loading ? 'Please wait…' : tab === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="mono text-[9px] uppercase tracking-[0.13em] text-muted-dim">or</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <button type="button" onClick={handleGoogle} className="btn btn-secondary w-full">
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="mt-4 w-full text-center text-[11px] font-medium text-muted-dim transition-colors hover:text-muted"
            >
              Continue without an account · offline only
            </button>
          </div>

          <p className="mono mt-6 text-center text-[9px] uppercase tracking-[0.16em] text-muted-dim">
            Private by default · Sync when you want
          </p>
        </div>
      </main>
    </div>
  )
}
