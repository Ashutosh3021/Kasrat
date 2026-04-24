import Dexie, { type Table } from 'dexie'

export type SetType = 'normal' | 'warmup' | 'superset' | 'giant' | 'circuit'

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
  rpe?: number
  rir?: number
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
  setType?: SetType
  supersetGroup?: string
}

export interface ExerciseMeta {
  name: string
  cues?: string
}

export interface BodyMeasurement {
  id?: number
  created: string
  bodyWeight?: number
  fatPercentage?: number
  arms?: number
  chest?: number
  thigh?: number
  calves?: number
  waist?: number
  notes?: string
}

// F2 – Nutrition
export interface DailyNutrition {
  date: string        // 'YYYY-MM-DD', primary key
  calories?: number
  protein?: number    // grams
  carbs?: number      // grams
  fats?: number       // grams
  water?: number      // litres
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
  // F2 – nutrition goals (optional)
  nutritionCaloriesGoal?: number
  nutritionProteinGoal?: number
  nutritionWaterGoal?: number
}

export class KasratDB extends Dexie {
  gym_sets!: Table<GymSet>
  plans!: Table<Plan>
  plan_exercises!: Table<PlanExercise>
  settings!: Table<Settings>
  body_measurements!: Table<BodyMeasurement>
  exercise_meta!: Table<ExerciseMeta>
  daily_nutrition!: Table<DailyNutrition>

  constructor() {
    super('KasratDB')

    this.version(1).stores({
      gym_sets: '++id, name, created, cardio, planId',
      plans: '++id, sequence, title',
      plan_exercises: '++id, planId, exercise',
      settings: '++id',
    })

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

    this.version(3).stores({
      gym_sets: '++id, name, created, cardio, planId',
      plans: '++id, sequence, title',
      plan_exercises: '++id, planId, exercise',
      settings: '++id',
      body_measurements: '++id, created',
    })

    this.version(4).stores({
      gym_sets: '++id, name, created, cardio, planId',
      plans: '++id, sequence, title',
      plan_exercises: '++id, planId, exercise',
      settings: '++id',
      body_measurements: '++id, created',
      exercise_meta: '&name',
    })

    // v5 – adds daily_nutrition table; nutrition goal fields on settings are optional (no upgrade needed)
    this.version(5).stores({
      gym_sets: '++id, name, created, cardio, planId',
      plans: '++id, sequence, title',
      plan_exercises: '++id, planId, exercise',
      settings: '++id',
      body_measurements: '++id, created',
      exercise_meta: '&name',
      daily_nutrition: '&date',   // date is the primary key
    })
  }
}

export const db = new KasratDB()
