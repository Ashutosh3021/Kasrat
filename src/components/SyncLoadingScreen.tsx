import { useState, useEffect } from 'react'
import { useSyncStore } from '../store/syncStore'

export default function SyncLoadingScreen() {
  const isInitialPulling = useSyncStore((state) => state.isInitialPulling)
  const setIsInitialPulling = useSyncStore((state) => state.setIsInitialPulling)
  const [showSubMessage, setShowSubMessage] = useState(false)

  useEffect(() => {
    let subMessageTimer: number
    let forceDismissTimer: number
    if (isInitialPulling) {
      setShowSubMessage(false)
      subMessageTimer = window.setTimeout(() => setShowSubMessage(true), 5000)
      // Never block the UI indefinitely on slow mobile networks
      forceDismissTimer = window.setTimeout(() => {
        console.warn('[sync] initial pull overlay auto-dismissed after 45s')
        setIsInitialPulling(false)
      }, 45_000)
    }
    return () => {
      clearTimeout(subMessageTimer)
      clearTimeout(forceDismissTimer)
    }
  }, [isInitialPulling, setIsInitialPulling])

  if (!isInitialPulling) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ground px-6" aria-live="polite">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-accent shadow-[0_24px_60px_-24px_rgba(198,58,25,0.9)]">
          <span className="text-[34px] font-black leading-none tracking-[-0.08em] text-on-accent">K</span>
        </div>

        <p className="mono mt-5 text-[9px] uppercase tracking-[0.26em] text-accent-soft">Kasrat</p>
        <h2 className="mt-2 text-[22px] font-bold tracking-[-0.04em] text-ink">Bringing your log back</h2>
        <p className="mt-1.5 text-[13px] text-muted">Syncing the sets you have already put in.</p>

        <div className="mt-7 h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
        </div>

        {showSubMessage && (
          <div className="mt-6 animate-fadeIn">
            <p className="max-w-[250px] text-[12px] leading-relaxed text-muted">
              This only happens once. Taking longer than usual?
            </p>
            <button
              type="button"
              onClick={() => setIsInitialPulling(false)}
              className="btn btn-secondary btn-sm mt-3"
            >
              Continue offline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
