import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { router } from './router'
import { supabase } from './supabase/client'

registerSW({ onNeedRefresh() {}, onOfflineReady() {} })

async function init() {
  const rawHash = window.location.hash.replace(/^#+/, '')
  const params = new URLSearchParams(rawHash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const errorCode = params.get('error')
  const errorDesc = params.get('error_description')

  console.log('[Kasrat:init] URL hash:', window.location.hash || '(empty)')
  console.log('[Kasrat:init] Has access_token:', !!accessToken)
  console.log('[Kasrat:init] Has refresh_token:', !!refreshToken)

  // OAuth returned an error (e.g. user denied Google permission)
  if (errorCode) {
    console.error('[Kasrat:init] OAuth error from provider:', errorCode, errorDesc)
    window.history.replaceState(null, '', window.location.pathname + '#/login')
  } else if (accessToken && refreshToken) {
    console.log('[Kasrat:init] OAuth callback detected — calling setSession()')
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        console.error('[Kasrat:init] setSession() failed:', error.message, error)
      } else {
        console.log('[Kasrat:init] setSession() success — user:', data.session?.user?.email)
      }
    } catch (err) {
      console.error('[Kasrat:init] setSession() threw:', err)
    }
    window.history.replaceState(null, '', window.location.pathname + '#/')
  } else {
    console.log('[Kasrat:init] Normal load — calling getSession()')
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[Kasrat:init] getSession() failed:', error.message)
    } else {
      console.log('[Kasrat:init] getSession() result — user:', data.session?.user?.email ?? 'none (not logged in)')
    }
  }

  console.log('[Kasrat:init] Rendering React...')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

init()
