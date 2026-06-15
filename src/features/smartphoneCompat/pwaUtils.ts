/**
 * Feature 10: Smartphone Compatibility — PWA & Mobile Utilities
 *
 * Handles:
 * - PWA install prompt (shown after 2 sessions)
 * - Install eligibility detection
 * - Session counting via localStorage
 */

const SESSION_COUNT_KEY = 'kasrat_session_count'
const PWA_DISMISSED_KEY = 'kasrat_pwa_dismissed'
const INSTALL_THRESHOLD = 2

// ─── Session Counting ─────────────────────────────────────────────────────────

export function incrementSessionCount(): number {
  const current = getSessionCount()
  const next = current + 1
  localStorage.setItem(SESSION_COUNT_KEY, String(next))
  return next
}

export function getSessionCount(): number {
  return parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? '0', 10)
}

// ─── Install Prompt ───────────────────────────────────────────────────────────

let _deferredPrompt: BeforeInstallPromptEvent | null = null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Register the beforeinstallprompt event listener once */
export function registerInstallPromptListener(): void {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    _deferredPrompt = e as BeforeInstallPromptEvent
  })
}

export function canShowInstallPrompt(): boolean {
  if (localStorage.getItem(PWA_DISMISSED_KEY) === 'true') return false
  if (!_deferredPrompt) return false
  return getSessionCount() >= INSTALL_THRESHOLD
}

export async function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!_deferredPrompt) return 'unavailable'
  await _deferredPrompt.prompt()
  const { outcome } = await _deferredPrompt.userChoice
  _deferredPrompt = null
  if (outcome === 'dismissed') {
    localStorage.setItem(PWA_DISMISSED_KEY, 'true')
  }
  return outcome
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(PWA_DISMISSED_KEY, 'true')
}

// ─── Mobile Detection ─────────────────────────────────────────────────────────

/** Returns true if the app is running as a standalone PWA */
export function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

/** Returns true for touch-first devices */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/** Returns the safe bottom inset (notch/home bar) in pixels */
export function getSafeAreaBottom(): number {
  const el = document.documentElement
  const val = getComputedStyle(el).getPropertyValue('--sab') ||
    getComputedStyle(el).getPropertyValue('env(safe-area-inset-bottom)') ||
    '0px'
  return parseInt(val, 10) || 0
}
