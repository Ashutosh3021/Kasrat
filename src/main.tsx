import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { router } from './router'

// Register service worker — auto-updates silently in background
registerSW({
  onNeedRefresh() {},   // new content available — handled by autoUpdate
  onOfflineReady() {
    console.log('KASRAT is ready to work offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
