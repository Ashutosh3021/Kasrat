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

  // OAuth returned an error (e.g. user denied Google permission)
  if (errorCode) {
    console.error('[Kasrat] OAuth error from provider:', errorCode, errorDesc)
    window.history.replaceState(null, '', window.location.pathname + '#/login')
  } else if (accessToken && refreshToken) {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        console.error('[Kasrat] OAuth setSession failed:', error.message)
      }
    } catch (err) {
      console.error('[Kasrat] OAuth setSession threw:', err)
    }
    window.history.replaceState(null, '', window.location.pathname + '#/')
  } else {
    const { error } = await supabase.auth.getSession()
    if (error) {
      console.error('[Kasrat] getSession failed:', error.message)
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

init()
