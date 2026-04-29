import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../supabase/client'

type Tab = 'login' | 'signup'

// Safe env helper — handles Vite's string "undefined" for missing vars.
const env = (value?: string) =>
  value && value !== 'undefined' ? value : undefined

// Build the OAuth redirectTo URL.
// MUST end with /# so that after Google redirects back:
//   https://ashutosh3021.github.io/Kasrat/#access_token=...
// The hash router sees route "/" (correct), and Supabase reads the token
// from window.location.hash via detectSessionInUrl.
//
// Without /#, tokens land as:
//   https://ashutosh3021.github.io/Kasrat#access_token=...
// Hash router tries to match "/auth/v1/authorize..." as a route → 404.
function getOAuthRedirectTo(): string {
  const configured = env(import.meta.env.VITE_SUPABASE_REDIRECT_URL)
  const base = configured
    ?? (import.meta.env.DEV
      ? `${window.location.origin}/Kasrat`
      : 'https://ashutosh3021.github.io/Kasrat')
  // Strip any trailing slash or hash, then append /#
  return base.replace(/[/#]+$/, '') + '/#'
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

  // FIX 3: Single form submit handler — called by both the button and
  // the form's onSubmit so Enter key and autofill both work correctly.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()  // prevents page reload (fixes browser password warning)
    if (tab === 'login') {
      await handleLogin()
    } else {
      await handleSignUp()
    }
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
    // navigate() is safe here — signInWithPassword does NOT do a browser redirect.
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
      },
    })
    if (err) { setError(err.message); return }
    // window.location.href bypasses React Router entirely.
    // Never use navigate() here — this is an external URL.
    if (data?.url) {
      window.location.href = data.url
    }
  }

  const inputCls =
    'w-full bg-[#151515] border border-[#2C2C2E] px-3 py-3 text-[17px] text-white ' +
    'placeholder-[#A1A1A6] focus:border-[#93032E] focus:outline-none'

  return (
    <div className="min-h-screen bg-[#151515] flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm bg-[#1C1C1E] border border-[#2C2C2E] p-6 flex flex-col gap-6"
        style={{ borderRadius: '4px' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-14 h-14 bg-[#93032E] flex items-center justify-center mb-2"
            style={{ borderRadius: '4px' }}
          >
            <span className="text-[32px] font-black text-white italic leading-none">K</span>
          </div>
          <h1 className="text-[28px] font-semibold text-white tracking-tight">KASRAT</h1>
          <p className="text-[13px] font-medium text-[#A1A1A6]">
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Tab toggle */}
        <div
          className="flex bg-[#151515] border border-[#2C2C2E] p-0.5"
          style={{ borderRadius: '2px' }}
        >
          {(['login', 'signup'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(''); setInfo('') }}
              className={`flex-1 h-9 text-[13px] font-medium transition-colors ${
                tab === t ? 'bg-[#93032E] text-white' : 'text-[#A1A1A6]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              {t === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Error / info */}
        {error && <p className="text-[#FF453A] text-[13px] font-medium -mt-2">{error}</p>}
        {info  && <p className="text-emerald-400 text-[13px] font-medium -mt-2">{info}</p>}

        {/* FIX 4: Wrap email + password + submit inside a real <form>.
            This enables:
            - Browser password manager autofill
            - Enter key submission
            - No "password field not inside a form" browser warning
            - Correct autocomplete attributes */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-[#A1A1A6]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
              style={{ borderRadius: '2px' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-[#A1A1A6]">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pr-10`}
                style={{ borderRadius: '2px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1A6] hover:text-white"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw
                  ? <EyeOff size={18} strokeWidth={1.5} />
                  : <Eye size={18} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* type="submit" so Enter key and form submission both work */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#93032E] text-white font-semibold text-[15px] mt-1 disabled:opacity-60 transition-opacity"
            style={{ borderRadius: '2px' }}
          >
            {loading
              ? 'Please wait…'
              : tab === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#2C2C2E]" />
          <span className="text-[13px] text-[#424754]">or</span>
          <div className="flex-1 h-px bg-[#2C2C2E]" />
        </div>

        {/* Google OAuth — type="button" prevents accidental form submission */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full h-12 border border-[#2C2C2E] text-white font-medium text-[15px] flex items-center justify-center gap-3 hover:border-[#93032E]/40 transition-colors"
          style={{ borderRadius: '2px' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Offline skip */}
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="text-[13px] text-[#424754] hover:text-[#A1A1A6] transition-colors text-center"
        >
          Continue without account (offline only)
        </button>
      </div>
    </div>
  )
}
