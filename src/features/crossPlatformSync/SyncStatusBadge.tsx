/**
 * Feature 9: Cross-Platform Syncing — Sync Status Badge
 *
 * A small indicator showing online/offline state and pending queue count.
 * Drop into TopBar or any header without modifying existing components.
 */

import { useCallback, useEffect, useState } from 'react'
import { Cloud, CloudOff, RefreshCw, CheckCircle } from 'lucide-react'
import { getSyncStatus, type SyncStatus } from './syncEnhancements'
import { supabase } from '../../supabase/client'
import { syncToSupabase } from '../../supabase/sync'

export default function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>({
    pendingCount: 0,
    failedCount: 0,
    isOnline: navigator.onLine,
  })
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    const s = await getSyncStatus()
    setStatus(s)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    const interval = setInterval(refresh, 10_000)
    const handleOnline = () => setStatus(s => ({ ...s, isOnline: true }))
    const handleOffline = () => setStatus(s => ({ ...s, isOnline: false }))
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refresh])

  async function handleManualSync() {
    if (syncing || !status.isOnline) return
    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await syncToSupabase(session.user.id)
      }
      await refresh()
    } finally {
      setSyncing(false)
    }
  }

  if (!status.isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-[2px] bg-[#FF9F0A]/10 border border-[#FF9F0A]/30">
        <CloudOff size={12} strokeWidth={1.5} className="text-[#FF9F0A]" />
        <span className="text-[11px] font-medium text-[#FF9F0A]">Offline</span>
      </div>
    )
  }

  if (status.pendingCount > 0) {
    return (
      <button
        onClick={handleManualSync}
        className="flex items-center gap-1.5 px-2 py-1 rounded-[2px] bg-[#0A84FF]/10 border border-[#0A84FF]/30"
      >
        {syncing ? (
          <RefreshCw size={12} strokeWidth={1.5} className="text-[#0A84FF] animate-spin" />
        ) : (
          <Cloud size={12} strokeWidth={1.5} className="text-[#0A84FF]" />
        )}
        <span className="text-[11px] font-medium text-[#0A84FF]">
          {syncing ? 'Syncing…' : `${status.pendingCount} pending`}
        </span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 opacity-60">
      <CheckCircle size={12} strokeWidth={1.5} className="text-[#30D158]" />
      <span className="text-[11px] font-medium text-[#30D158]">Synced</span>
    </div>
  )
}
