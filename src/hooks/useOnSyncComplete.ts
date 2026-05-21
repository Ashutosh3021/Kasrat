import { useEffect, useRef } from 'react'
import { useSyncStore } from '../store/syncStore'

/**
 * Re-run `onComplete` when a background pull finishes (lastSyncedAt updates)
 * or when the initial pull overlay dismisses. Fixes pages that mounted with
 * an empty IndexedDB before sync completed.
 */
export function useOnSyncComplete(onComplete: () => void | Promise<void>) {
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const isInitialPulling = useSyncStore((s) => s.isInitialPulling)
  const prevSyncedAt = useRef<string | null>(null)
  const wasPulling = useRef(false)

  useEffect(() => {
    if (isInitialPulling) {
      wasPulling.current = true
      return
    }

    const syncedChanged =
      lastSyncedAt != null && lastSyncedAt !== prevSyncedAt.current
    const overlayDismissed = wasPulling.current

    if (syncedChanged || overlayDismissed) {
      prevSyncedAt.current = lastSyncedAt
      wasPulling.current = false
      void onComplete()
    }
  }, [lastSyncedAt, isInitialPulling, onComplete])
}
