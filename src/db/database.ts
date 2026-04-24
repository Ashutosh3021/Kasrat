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
  primaryMuscle?: string
  secondaryMuscle?: string
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
  sortOrder?: number
}

export interface BodyMeasurement {
  id?: number
  created: string        // ISO date string, indexed
  bodyWeight?: number
  fatPercentage?: number
  arms?: number
  chest?: number
  thigh?: number
  calves?: number
  waist?: number
  notes?: string
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
  tabOrder: string
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
  body_measurements!: Table<BodyMeasurement>

  constructor() {
    super('KasratDB')

    // v1 — original schema
    this.version(1).stores({
      gym_sets: '++id, name, created, cardio, planId',
      plans: '++id, sequence, title',
      plan_exercises: '++id, planId, exercise',
      settings: '++id',
    })

    // v2 — back-fills primaryMuscle / secondaryMuscle on gym_sets
    this.version(2)
      .stores({
        gym_sets: '++id, name, created, cardio, planId',
        plans: '++id, sequence, title',
        plan_exercises: '++id, planId, exercise',
        settings: '++id',
      })
      .upgrade(tx =>
        tx.table('gym_sets').toCollection().modify(row => {
          if (row.primaryMuscle === undefined) row.primaryMuscle = 'Other'
          if (row.secondaryMuscle === undefined) row.secondaryMuscle = null
        })
      )

    // v3 — adds body_measurements table
    this.version(3).stores({
      gym_sets: '++id, name, created, cardio, planId',
      plans: '++id, sequence, title',
      plan_exercises: '++id, planId, exercise',
      settings: '++id',
      body_measurements: '++id, created',
    })
  }
}

export const db = new KasratDB()
