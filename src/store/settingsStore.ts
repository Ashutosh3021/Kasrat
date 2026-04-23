import { create } from 'zustand'
import { db, type Settings } from '../db/database'
import { DEFAULT_SETTINGS } from '../db/defaults'

interface SettingsState {
  settings: Settings
  loaded: boolean
  loadSettings: () => Promise<void>
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS } as Settings,
  loaded: false,

  loadSettings: async () => {
    const s = await db.settings.toArray()
    if (s.length > 0) {
      set({ settings: s[0], loaded: true })
    } else {
      set({ loaded: true })
    }
  },

  updateSetting: async (key, value) => {
    const { settings } = get()
    const updated = { ...settings, [key]: value }
    set({ settings: updated })
    if (settings.id) {
      await db.settings.update(settings.id, { [key]: value })
    }
  }
}))
