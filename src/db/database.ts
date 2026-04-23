import Dexie, { type Table } from 'dexie'

export interface GymSet {
  id?: number
  name: string
  reps: number
  weight: number
  unit: string
  created: string
  hidden: boolean
  bodyWeight: boolean
  duration: number
  distance: number
  cardio: boolean
  restMs: number
  incline?: number
  planId?: number
  image?: string
  notes?: string
}

export interface Plan {
  id?: number
  sequence: number
  exercises: string
  days: string
  title: string
}

export interface PlanExercise {
  id?: number
  planId: number
  exercise: string
  enabled: boolean
  maxSets: number
}

export interface Settings {
  id?: number
  themeMode: string
  planTrailing: string
  longDateFormat: string
  shortDateFormat: string
  timerDuration: number
  maxSets: number
  vibrate: boolean
  restTimers: boolean
  showUnits: boolean
  systemColors: boolean
  curveLines: boolean
  hideWeight: boolean
  groupHistory: boolean
  alarmSound: string
  cardioUnit: string
  strengthUnit: string
  showReorderHandles: boolean
  showPlanCounts: boolean
  hiddenTabs: string
  autoStartTimer: boolean
  repEstimation: boolean
  durationEstimation: boolean
  relativeTime: boolean
  use24Hour: boolean
  hideCategories: boolean
  hideGlobalProgress: boolean
}

export class KasratDB extends Dexie {
  gym_sets!: Table<GymSet>
  plans!: Table<Plan>
  plan_exercises!: Table<PlanExercise>
  settings!: Table<Settings>

  constructor() {
    super('KasratDB')
    this.version(1).stores({
      gym_sets: '++id, name, created, cardio, planId',
      plans: '++id, sequence, title',
      plan_exercises: '++id, planId, exercise',
      settings: '++id'
    })
  }
}

export const db = new KasratDB()
