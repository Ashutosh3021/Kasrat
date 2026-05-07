import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SyncState {
  hasPulled: boolean
  isSyncing: boolean
  isInitialPulling: boolean
  lastSyncedAt: string | null

  setHasPulled: (v: boolean) => void
  setIsSyncing: (v: boolean) => void
  setIsInitialPulling: (v: boolean) => void
  setLastSyncedAt: (v: string | null) => void
  resetSync: () => void
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      // Not persisted
      hasPulled: false,
      isSyncing: false,
      isInitialPulling: false,

      // Persisted
      lastSyncedAt: null,

      setHasPulled: (v) => set({ hasPulled: v }),
      setIsSyncing: (v) => set({ isSyncing: v }),
      setIsInitialPulling: (v) => set({ isInitialPulling: v }),
      setLastSyncedAt: (v) => set({ lastSyncedAt: v }),

      resetSync: () => set({
        hasPulled: false,
        isSyncing: false,
        isInitialPulling: false,
        lastSyncedAt: null
      })
    }),
    {
      name: 'kasrat-sync-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist lastSyncedAt
      partialize: (state) => ({ lastSyncedAt: state.lastSyncedAt }),
    }
  )
)
