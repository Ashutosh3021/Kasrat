import { db } from './database'

export const DEFAULT_SETTINGS = {
  themeMode: 'dark',
  planTrailing: 'Count',
  longDateFormat: 'EEEE, MMMM d, y',
  shortDateFormat: 'MM/dd/yy',
  timerDuration: 210,
  maxSets: 3,
  vibrate: true,
  restTimers: true,
  showUnits: true,
  systemColors: false,
  curveLines: true,
  hideWeight: false,
  groupHistory: true,
  alarmSound: 'Argon',
  cardioUnit: 'km',
  strengthUnit: 'kg',
  showReorderHandles: true,
  showPlanCounts: true,
  hiddenTabs: '',
  autoStartTimer: true,
  repEstimation: true,
  durationEstimation: true,
  relativeTime: false,
  use24Hour: false,
  hideCategories: false,
  hideGlobalProgress: false,
}

export async function seedDatabase() {
  const settingsCount = await db.settings.count()
  if (settingsCount === 0) {
    await db.settings.add(DEFAULT_SETTINGS)
  }
}
