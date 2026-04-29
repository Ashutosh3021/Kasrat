import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { router } from './router'
import { supabase } from './supabase/client'

registerSW({ onNeedRefresh() {}, onOfflineReady() {} })

async function init() {
  // Read the raw hash BEFORE React or the router touch anything.
  // With HashRouter + implicit flow, the OAuth callback URL looks like:
  //   https://site.com/#access_token=TOKEN&refresh_token=TOKEN&type=bearer
  // The hash (minus the leading #) is a URLSearchParams string.
  const rawHash = window.location.hash.slice(1) // strip leading #
  const params = new URLSearchParams(rawHash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (accessToken && refreshToken) {
    // We are on an OAuth callback. Explicitly hand the tokens to Supabase.
    // This is 100% reliable — no timing, no detectSessionInUrl race.
    // Supabase stores the session in localStorage immediately.
    try {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    } catch (err) {
      console.error('[Kasrat] OAuth session error:', err)
    }
    // Wipe the tokens from the URL now (before router renders).
    // Router will start cleanly at #/ with the session already stored.
    window.history.replaceState(null, '', window.location.pathname + '#/')
  } else {
    // Normal page load — restore session from localStorage.
    await supabase.auth.getSession()
  }

  // By this point, session is in localStorage no matter what.
  // React Router rendering now cannot interfere with auth.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

init()
