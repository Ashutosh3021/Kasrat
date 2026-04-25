import { db } from './database'
import { EXERCISE_PRESETS } from '../data/exercisePresets'

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
  tabOrder: '',
  autoStartTimer: true,
  repEstimation: true,
  durationEstimation: true,
  relativeTime: false,
  use24Hour: false,
  hideCategories: false,
  hideGlobalProgress: false,
  // F2 – nutrition goals (0 = not set)
  nutritionCaloriesGoal: 0,
  nutritionProteinGoal: 0,
  nutritionWaterGoal: 0,
}

export async function seedDatabase() {
  const settingsCount = await db.settings.count()
  if (settingsCount === 0) {
    await db.settings.add(DEFAULT_SETTINGS)
  }

  // Seed exercise presets if table is empty
  const presetsCount = await db.exercise_presets.count()
  if (presetsCount === 0) {
    await db.exercise_presets.bulkAdd(EXERCISE_PRESETS)
  }
}

export async function restoreDefaultExercises() {
  // Re-insert all presets without duplicates
  for (const preset of EXERCISE_PRESETS) {
    const existing = await db.exercise_presets.get(preset.name)
    if (!existing) {
      await db.exercise_presets.add(preset)
    }
  }
}
