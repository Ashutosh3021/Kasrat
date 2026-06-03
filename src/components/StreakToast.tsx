import { useEffect } from 'react'
import { Flame, X } from 'lucide-react'
import { useStreakStore } from '../store/streakStore'

/** Floating feedback when the streak increases or resets */
export default function StreakToast() {
  const toast = useStreakStore(s => s.toast)
  const dismissToast = useStreakStore(s => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(dismissToast, 5000)
    return () => window.clearTimeout(t)
  }, [toast, dismissToast])

  if (!toast) return null

  const isUp = toast.type === 'increased'

  return (
    <div
      className="fixed left-4 right-4 z-[90] mx-auto max-w-2xl"
      style={{ top: '4.5rem' }}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-3 border px-3 py-3 shadow-lg ${
          isUp
            ? 'bg-[#93032E]/15 border-[#93032E]/50'
            : 'bg-[#1C1C1E] border-[#2C2C2E]'
        }`}
        style={{ borderRadius: '4px' }}
      >
        <Flame
          size={20}
          className={isUp ? 'text-[#93032E] shrink-0 mt-0.5' : 'text-[#A1A1A6] shrink-0 mt-0.5'}
          strokeWidth={1.5}
        />
        <p className={`text-[15px] font-medium flex-1 ${isUp ? 'text-white' : 'text-[#A1A1A6]'}`}>
          {toast.message}
        </p>
        <button
          type="button"
          onClick={dismissToast}
          className="text-[#A1A1A6] hover:text-white p-1 -mr-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
