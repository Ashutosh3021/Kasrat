import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { router } from './router'
import { supabase } from './supabase/client'

registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
})

// CRITICAL: Wait for Supabase to detect and store the session from the URL
// BEFORE React renders anything.
//
// Without this, the sequence is:
//   1. App loads at /#access_token=TOKEN
//   2. Supabase starts reading the hash... (async, not yet done)
//   3. React Router renders → catch-all fires → replaceState(/#/)
//   4. Hash is now #/ — the token is gone from the URL
//   5. Supabase reads window.location.hash → empty → session = null
//   6. INITIAL_SESSION fires null → redirect to /login
//
// With this fix:
//   1. App loads at /#access_token=TOKEN
//   2. getSession() runs → Supabase reads hash, stores session in memory/localStorage
//   3. React renders → catch-all fires → replaceState(/#/)  ← hash cleared, but too late
//   4. Supabase already has the session stored → INITIAL_SESSION fires with session ✓
//   5. No redirect to /login
supabase.auth.getSession().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
})
