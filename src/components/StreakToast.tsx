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
      className="fixed left-4 right-4 z-[90] mx-auto max-w-md animate-rise"
      style={{ top: '4.75rem' }}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border bg-surface/95 p-3.5 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl ${
          isUp ? 'border-accent/45' : 'border-line'
        }`}
      >
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isUp ? 'bg-accent/10 text-accent-soft' : 'bg-surface-high text-muted'}`}>
          <Flame size={17} strokeWidth={1.8} />
        </span>
        <p className={`flex-1 text-[13px] font-medium leading-snug ${isUp ? 'text-ink' : 'text-muted'}`}>
          {toast.message}
        </p>
        <button
          type="button"
          onClick={dismissToast}
          className="-mr-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
