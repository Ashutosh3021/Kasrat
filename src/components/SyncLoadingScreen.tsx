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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#151515] transition-opacity duration-300">
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        {/* App Logo */}
        <div className="w-16 h-16 bg-[#93032E] flex items-center justify-center shadow-lg" style={{ borderRadius: '8px' }}>
          <span className="text-[36px] font-black text-white italic leading-none">K</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-[#93032E] border-t-transparent rounded-full animate-spin mb-2" />
          <h2 className="text-xl font-bold text-white tracking-tight">Syncing your data…</h2>
        </div>

        {showSubMessage && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm text-gray-400 max-w-[240px]">
              This only happens once. Taking longer than usual?
            </p>
            <button
              onClick={() => setIsInitialPulling(false)}
              className="text-[#93032E] text-sm font-semibold hover:underline underline-offset-4"
            >
              Continue offline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
