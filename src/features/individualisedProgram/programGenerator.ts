/**
 * Feature 12: Individualised Program Generation — Master Key System
 *
 * Implements a 4-step "Choose-Your-Own-Adventure" generator:
 *  Step 1: Split structure (by training days: 3=Full Body, 5=Upper/Lower, 6=PPL)
 *  Step 2: Exercise pool (by equipment)
 *  Step 3: Volume/Intensity matrix (by experience + goal)
 *  Step 4: Specialisation protocol (by emphasis)
 *
 * Each combination of days × equipment × experience × goal × emphasis
 * produces a distinct set of day plans saved as separate Plan rows.
 */

import type { WizardGoalType, WizardEmphasis } from '../trainingPhaseTemplates/wizardTypes'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type EquipmentType = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'
export type TrainingDays = 3 | 5 | 6

export interface ProgramInputs {
  goalType: WizardGoalType
  emphasis: WizardEmphasis
  experienceLevel: ExperienceLevel
  availableEquipment: EquipmentType[]
  trainingDays: TrainingDays
}

export interface GeneratedExercise {
  name: string
  sets: number
  repMin: number
  repMax: number
  restSeconds: number
  primaryMuscle: string
  priorityLevel: 'primary' | 'secondary'
  notes?: string
}

export interface GeneratedSession {
  dayOfWeek: number   // 0=Sun … 6=Sat (Mon=1 … Sun=0)
  label: string
  focusLabel: string  // e.g. "Push", "Upper A", "Full A"
  exercises: GeneratedExercise[]
}

export interface GeneratedPlan {
  title: string
  goalType: WizardGoalType
  experienceLevel: ExperienceLevel
  trainingDays: TrainingDays
  splitName: string
  sessions: GeneratedSession[]
}

// ─── Step 3: Volume/Intensity Matrix ─────────────────────────────────────────

interface VolumeParams {
  sets: number
  repMin: number
  repMax: number
  restSeconds: number
  notes: string
}

const VOLUME_MATRIX: Record<ExperienceLevel, Record<WizardGoalType, VolumeParams>> = {
  beginner: {
    bulk:   { sets: 3, repMin: 8,  repMax: 12, restSeconds: 90, notes: '' },
    cut:    { sets: 3, repMin: 10, repMax: 15, restSeconds: 60, notes: 'Superset to save time' },
    recomp: { sets: 3, repMin: 10, repMax: 12, restSeconds: 75, notes: '' },
  },
  intermediate: {
    bulk:   { sets: 4, repMin: 8,  repMax: 10, restSeconds: 75, notes: 'Drop sets on last set' },
    cut:    { sets: 4, repMin: 10, repMax: 12, restSeconds: 53, notes: 'Drop sets on last set' },
    recomp: { sets: 4, repMin: 8,  repMax: 12, restSeconds: 60, notes: '' },
  },
  advanced: {
    bulk:   { sets: 5, repMin: 5,  repMax: 8,  restSeconds: 90, notes: 'Heavy compound focus' },
    cut:    { sets: 5, repMin: 8,  repMax: 10, restSeconds: 45, notes: 'Myo-reps on last set' },
    recomp: { sets: 5, repMin: 6,  repMax: 10, restSeconds: 75, notes: '' },
  },
}

// ─── Step 2: Exercise Pool (by equipment) ─────────────────────────────────────

type EquipmentPool = 'full' | 'barbell_db' | 'db_bw' | 'machine_cable'

function resolvePool(equipment: EquipmentType[]): EquipmentPool {
  const has = (e: EquipmentType) => equipment.includes(e)
  if (has('barbell') && (has('machine') || has('cable'))) return 'full'
  if (has('barbell') && has('dumbbell')) return 'barbell_db'
  if (has('machine') || has('cable')) return 'machine_cable'
  return 'db_bw'
}

// Movement pattern → exercise name per equipment pool
const EXERCISE_POOL: Record<string, Record<EquipmentPool, string>> = {
  'Horizontal Push':   { full: 'Flat bench press (Barbell)',    barbell_db: 'Flat bench press (Barbell)',    db_bw: 'Flat bench press (Dumbbell)',    machine_cable: 'Machine chest press' },
  'Incline Push':      { full: 'Incline bench press (Dumbbell)',barbell_db: 'Incline bench press (Barbell)', db_bw: 'Incline bench press (Dumbbell)', machine_cable: 'Smith machine incline press' },
  'Vertical Push':     { full: 'Overhead press (Barbell)',      barbell_db: 'Overhead press (Barbell)',      db_bw: 'Overhead press (Dumbbell)',      machine_cable: 'Machine shoulder press' },
  'Horizontal Pull':   { full: 'Barbell row',                   barbell_db: 'Barbell row',                  db_bw: 'Dumbbell single-arm row',         machine_cable: 'Seated cable row' },
  'Vertical Pull':     { full: 'Lat pull downs',                barbell_db: 'Pull-ups',                     db_bw: 'Pull-ups',                        machine_cable: 'Lat pull downs' },
  'Hinge':             { full: 'Romanian deadlift',             barbell_db: 'Romanian deadlift',            db_bw: 'Dumbbell RDL',                   machine_cable: 'Lying leg curl' },
  'Squat':             { full: 'Squat (Regular)',               barbell_db: 'Squat (Regular)',              db_bw: 'Bulgarian split squat',           machine_cable: 'Hack squat' },
  'Chest Isolation':   { full: 'Cable fly',                     barbell_db: 'Dumbbell fly',                 db_bw: 'Push-ups (diamond)',              machine_cable: 'Pec deck fly' },
  'Delts':             { full: 'Lateral raise (Dumbbell)',      barbell_db: 'Lateral raise (Dumbbell)',     db_bw: 'Lateral raise (Dumbbell)',        machine_cable: 'Cable lateral raise' },
  'Biceps':            { full: 'Barbell curl',                  barbell_db: 'Barbell curl',                 db_bw: 'Dumbbell curl',                   machine_cable: 'Cable curl' },
  'Triceps':           { full: 'Cable push down',               barbell_db: 'Skull crusher',                db_bw: 'Close-grip push-ups',             machine_cable: 'Cable push down' },
  'Back Thickness':    { full: 'Chest supported row (machine)', barbell_db: 'Chest supported row (machine)',db_bw: 'Renegade rows',                   machine_cable: 'Machine rows' },
  'Quads':             { full: 'Leg extensions',                barbell_db: 'Leg extensions',               db_bw: 'Sissy squats',                    machine_cable: 'Leg extensions' },
  'Hamstrings':        { full: 'Lying leg curl',                barbell_db: 'Romanian deadlift',            db_bw: 'Nordic curls',                    machine_cable: 'Seated leg curl' },
  'Calves':            { full: 'Calf raise (Standing)',         barbell_db: 'Calf raise (Standing)',        db_bw: 'Single-leg calf raise',           machine_cable: 'Seated calf raise' },
  'Face Pulls':        { full: 'Face pull',                     barbell_db: 'Face pull',                    db_bw: 'Band pull-apart',                 machine_cable: 'Face pull' },
}

function ex(pattern: string, pool: EquipmentPool, muscle: string, priority: 'primary' | 'secondary'): { pattern: string; pool: EquipmentPool; muscle: string; priority: 'primary' | 'secondary' } {
  return { pattern, pool, muscle, priority }
}

function resolveExercise(
  pattern: string,
  pool: EquipmentPool,
  muscle: string,
  priority: 'primary' | 'secondary',
  params: VolumeParams,
  setsOverride?: number,
): GeneratedExercise {
  const name = (EXERCISE_POOL[pattern] ?? {})[pool] ?? pattern
  const sets = setsOverride ?? (priority === 'secondary' ? Math.max(2, params.sets - 1) : params.sets)
  return {
    name,
    sets,
    repMin: params.repMin,
    repMax: params.repMax,
    restSeconds: params.restSeconds,
    primaryMuscle: muscle,
    priorityLevel: priority,
    notes: params.notes || undefined,
  }
}

// ─── Step 4: Specialisation Extras ───────────────────────────────────────────

function emphasisExtras(
  emphasis: WizardEmphasis,
  sessionType: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full',
  pool: EquipmentPool,
  params: VolumeParams,
): GeneratedExercise[] {
  const extras: GeneratedExercise[] = []
  if (emphasis === 'arms' && (sessionType === 'push' || sessionType === 'upper' || sessionType === 'full')) {
    extras.push(resolveExercise('Triceps', pool, 'Triceps', 'secondary', params, 3))
  }
  if (emphasis === 'arms' && (sessionType === 'pull' || sessionType === 'upper' || sessionType === 'full')) {
    extras.push(resolveExercise('Biceps', pool, 'Biceps & Forearms', 'secondary', params, 3))
  }
  if (emphasis === 'chest' && (sessionType === 'push' || sessionType === 'upper' || sessionType === 'full')) {
    extras.push(resolveExercise('Chest Isolation', pool, 'Chest', 'secondary', params, 3))
  }
  if (emphasis === 'back' && (sessionType === 'pull' || sessionType === 'upper' || sessionType === 'full')) {
    extras.push(resolveExercise('Face Pulls', pool, 'Back & Traps', 'secondary', params, 3))
    extras.push(resolveExercise('Back Thickness', pool, 'Back & Traps', 'secondary', params, 3))
  }
  if (emphasis === 'legs' && (sessionType === 'legs' || sessionType === 'lower' || sessionType === 'full')) {
    extras.push(resolveExercise('Quads', pool, 'Legs', 'secondary', params, 3))
    extras.push(resolveExercise('Hamstrings', pool, 'Legs', 'secondary', params, 3))
  }
  return extras
}

// ─── Session Templates ────────────────────────────────────────────────────────

function buildPushSession(pool: EquipmentPool, params: VolumeParams, emphasis: WizardEmphasis): GeneratedExercise[] {
  const base: GeneratedExercise[] = [
    resolveExercise('Horizontal Push', pool, 'Chest', 'primary', params),
    resolveExercise('Incline Push',    pool, 'Chest', 'primary', params),
    resolveExercise('Vertical Push',   pool, 'Shoulders', 'primary', params),
    resolveExercise('Chest Isolation', pool, 'Chest', 'secondary', params),
    resolveExercise('Delts',           pool, 'Shoulders', 'secondary', params),
    resolveExercise('Triceps',         pool, 'Triceps', 'secondary', params),
  ]
  // Chest emphasis: lead with incline, add extra fly, reduce OHP to just laterals
  if (emphasis === 'chest') {
    base[0].sets += 1
    base[1].sets += 1
  }
  // Arms emphasis: triceps gets extra set
  if (emphasis === 'arms') {
    base[5].sets += 1
  }
  return [...base, ...emphasisExtras(emphasis, 'push', pool, params)]
}

function buildPullSession(pool: EquipmentPool, params: VolumeParams, emphasis: WizardEmphasis): GeneratedExercise[] {
  const base: GeneratedExercise[] = [
    resolveExercise('Horizontal Pull',pool, 'Back & Traps', 'primary', params),
    resolveExercise('Vertical Pull',  pool, 'Back & Traps', 'primary', params),
    resolveExercise('Back Thickness', pool, 'Back & Traps', 'secondary', params),
    resolveExercise('Face Pulls',     pool, 'Shoulders', 'secondary', params),
    resolveExercise('Biceps',         pool, 'Biceps & Forearms', 'secondary', params),
    resolveExercise('Delts',          pool, 'Shoulders', 'secondary', params),
  ]
  if (emphasis === 'back') {
    base[0].sets += 1
    base[2].sets += 1
  }
  if (emphasis === 'arms') {
    base[4].sets += 1
  }
  return [...base, ...emphasisExtras(emphasis, 'pull', pool, params)]
}

function buildLegsSession(pool: EquipmentPool, params: VolumeParams, emphasis: WizardEmphasis, variant: 'quad' | 'hinge' | 'balanced' = 'balanced'): GeneratedExercise[] {
  const base: GeneratedExercise[] = variant === 'quad'
    ? [
        resolveExercise('Squat',       pool, 'Legs', 'primary', params),
        resolveExercise('Quads',       pool, 'Legs', 'primary', params),
        resolveExercise('Hinge',       pool, 'Legs', 'secondary', params),
        resolveExercise('Hamstrings',  pool, 'Legs', 'secondary', params),
        resolveExercise('Calves',      pool, 'Legs', 'secondary', params),
      ]
    : variant === 'hinge'
    ? [
        resolveExercise('Hinge',       pool, 'Legs', 'primary', params),
        resolveExercise('Hamstrings',  pool, 'Legs', 'primary', params),
        resolveExercise('Squat',       pool, 'Legs', 'secondary', params),
        resolveExercise('Quads',       pool, 'Legs', 'secondary', params),
        resolveExercise('Calves',      pool, 'Legs', 'secondary', params),
      ]
    : [
        resolveExercise('Squat',       pool, 'Legs', 'primary', params),
        resolveExercise('Hinge',       pool, 'Legs', 'primary', params),
        resolveExercise('Quads',       pool, 'Legs', 'secondary', params),
        resolveExercise('Hamstrings',  pool, 'Legs', 'secondary', params),
        resolveExercise('Calves',      pool, 'Legs', 'secondary', params),
      ]
  if (emphasis === 'legs') {
    base[0].sets += 1
    if (base[1]) base[1].sets += 1
  }
  return [...base, ...emphasisExtras(emphasis, 'legs', pool, params)]
}

function buildUpperSession(pool: EquipmentPool, params: VolumeParams, emphasis: WizardEmphasis, variant: 'A' | 'B' | 'C'): GeneratedExercise[] {
  const base: GeneratedExercise[] = variant === 'A'
    ? [
        resolveExercise('Horizontal Push', pool, 'Chest', 'primary', params),
        resolveExercise('Horizontal Pull',  pool, 'Back & Traps', 'primary', params),
        resolveExercise('Vertical Push',    pool, 'Shoulders', 'primary', params),
        resolveExercise('Vertical Pull',    pool, 'Back & Traps', 'secondary', params),
        resolveExercise('Triceps',          pool, 'Triceps', 'secondary', params),
        resolveExercise('Biceps',           pool, 'Biceps & Forearms', 'secondary', params),
      ]
    : variant === 'B'
    ? [
        resolveExercise('Incline Push',     pool, 'Chest', 'primary', params),
        resolveExercise('Back Thickness',   pool, 'Back & Traps', 'primary', params),
        resolveExercise('Chest Isolation',  pool, 'Chest', 'secondary', params),
        resolveExercise('Face Pulls',       pool, 'Shoulders', 'secondary', params),
        resolveExercise('Triceps',          pool, 'Triceps', 'secondary', params),
        resolveExercise('Biceps',           pool, 'Biceps & Forearms', 'secondary', params),
      ]
    : [ // C — pump/volume day
        resolveExercise('Horizontal Push', pool, 'Chest', 'primary', params),
        resolveExercise('Horizontal Pull',  pool, 'Back & Traps', 'primary', params),
        resolveExercise('Delts',            pool, 'Shoulders', 'secondary', params),
        resolveExercise('Chest Isolation',  pool, 'Chest', 'secondary', params),
        resolveExercise('Biceps',           pool, 'Biceps & Forearms', 'secondary', params),
        resolveExercise('Triceps',          pool, 'Triceps', 'secondary', params),
      ]
  if (emphasis === 'chest' && (variant === 'A' || variant === 'B')) base[0].sets += 1
  if (emphasis === 'back' && (variant === 'A')) base[1].sets += 1
  if (emphasis === 'arms') { base[base.length - 2].sets += 1; base[base.length - 1].sets += 1 }
  return [...base, ...emphasisExtras(emphasis, 'upper', pool, params).slice(0, 1)]
}

function buildLowerSession(pool: EquipmentPool, params: VolumeParams, emphasis: WizardEmphasis, variant: 'A' | 'B'): GeneratedExercise[] {
  const base: GeneratedExercise[] = variant === 'A'
    ? [
        resolveExercise('Squat',      pool, 'Legs', 'primary', params),
        resolveExercise('Hinge',      pool, 'Legs', 'primary', params),
        resolveExercise('Quads',      pool, 'Legs', 'secondary', params),
        resolveExercise('Hamstrings', pool, 'Legs', 'secondary', params),
        resolveExercise('Calves',     pool, 'Legs', 'secondary', params),
      ]
    : [
        resolveExercise('Hinge',      pool, 'Legs', 'primary', params),
        resolveExercise('Squat',      pool, 'Legs', 'secondary', params),
        resolveExercise('Hamstrings', pool, 'Legs', 'primary', params),
        resolveExercise('Quads',      pool, 'Legs', 'secondary', params),
        resolveExercise('Calves',     pool, 'Legs', 'secondary', params),
      ]
  if (emphasis === 'legs') { base[0].sets += 1; if (base[2]) base[2].sets += 1 }
  return base
}

function buildFullSession(pool: EquipmentPool, params: VolumeParams, emphasis: WizardEmphasis, variant: 'A' | 'B' | 'C'): GeneratedExercise[] {
  const compoundSets = Math.max(2, params.sets - 1)
  const base: GeneratedExercise[] = variant === 'A'
    ? [
        resolveExercise('Squat',          pool, 'Legs', 'primary', params),
        resolveExercise('Horizontal Push', pool, 'Chest', 'primary', params, compoundSets),
        resolveExercise('Horizontal Pull', pool, 'Back & Traps', 'primary', params, compoundSets),
        resolveExercise('Hinge',          pool, 'Legs', 'secondary', params, compoundSets),
        resolveExercise('Delts',          pool, 'Shoulders', 'secondary', params, compoundSets),
        resolveExercise('Biceps',         pool, 'Biceps & Forearms', 'secondary', params, compoundSets),
        resolveExercise('Triceps',        pool, 'Triceps', 'secondary', params, compoundSets),
      ]
    : variant === 'B'
    ? [
        resolveExercise('Hinge',          pool, 'Legs', 'primary', params),
        resolveExercise('Incline Push',   pool, 'Chest', 'primary', params, compoundSets),
        resolveExercise('Vertical Pull',  pool, 'Back & Traps', 'primary', params, compoundSets),
        resolveExercise('Quads',          pool, 'Legs', 'secondary', params, compoundSets),
        resolveExercise('Face Pulls',     pool, 'Shoulders', 'secondary', params, compoundSets),
        resolveExercise('Biceps',         pool, 'Biceps & Forearms', 'secondary', params, compoundSets),
        resolveExercise('Triceps',        pool, 'Triceps', 'secondary', params, compoundSets),
      ]
    : [ // C
        resolveExercise('Squat',          pool, 'Legs', 'primary', params, compoundSets),
        resolveExercise('Vertical Push',  pool, 'Shoulders', 'primary', params, compoundSets),
        resolveExercise('Back Thickness', pool, 'Back & Traps', 'primary', params, compoundSets),
        resolveExercise('Hamstrings',     pool, 'Legs', 'secondary', params, compoundSets),
        resolveExercise('Chest Isolation',pool, 'Chest', 'secondary', params, compoundSets),
        resolveExercise('Calves',         pool, 'Legs', 'secondary', params, compoundSets),
      ]
  return [...base, ...emphasisExtras(emphasis, 'full', pool, params).slice(0, 1)]
}

// ─── Step 1: Split Structure ──────────────────────────────────────────────────

// Day assignments: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
function buildSplit(
  days: TrainingDays,
  pool: EquipmentPool,
  params: VolumeParams,
  emphasis: WizardEmphasis,
): Array<{ dayOfWeek: number; label: string; focusLabel: string; exercises: GeneratedExercise[] }> {
  if (days === 3) {
    // Full Body A/B/C — Mon, Wed, Fri
    return [
      { dayOfWeek: 1, label: 'Full Body A', focusLabel: 'Full A', exercises: buildFullSession(pool, params, emphasis, 'A') },
      { dayOfWeek: 3, label: 'Full Body B', focusLabel: 'Full B', exercises: buildFullSession(pool, params, emphasis, 'B') },
      { dayOfWeek: 5, label: 'Full Body C', focusLabel: 'Full C', exercises: buildFullSession(pool, params, emphasis, 'C') },
    ]
  }
  if (days === 5) {
    // Upper/Lower — Upper A Mon, Lower A Tue, Upper B Wed, Lower B Thu, Upper C Fri
    return [
      { dayOfWeek: 1, label: 'Upper A', focusLabel: 'Upper A', exercises: buildUpperSession(pool, params, emphasis, 'A') },
      { dayOfWeek: 2, label: 'Lower A', focusLabel: 'Lower A', exercises: buildLowerSession(pool, params, emphasis, 'A') },
      { dayOfWeek: 3, label: 'Upper B', focusLabel: 'Upper B', exercises: buildUpperSession(pool, params, emphasis, 'B') },
      { dayOfWeek: 4, label: 'Lower B', focusLabel: 'Lower B', exercises: buildLowerSession(pool, params, emphasis, 'B') },
      { dayOfWeek: 5, label: 'Upper C', focusLabel: 'Upper C', exercises: buildUpperSession(pool, params, emphasis, 'C') },
    ]
  }
  // 6 days: PPL×2 — Push, Pull, Legs, Push2, Pull2, Legs2
  return [
    { dayOfWeek: 1, label: 'Push 1',  focusLabel: 'Push',  exercises: buildPushSession(pool, params, emphasis) },
    { dayOfWeek: 2, label: 'Pull 1',  focusLabel: 'Pull',  exercises: buildPullSession(pool, params, emphasis) },
    { dayOfWeek: 3, label: 'Legs 1',  focusLabel: 'Legs',  exercises: buildLegsSession(pool, params, emphasis, 'quad') },
    { dayOfWeek: 4, label: 'Push 2',  focusLabel: 'Push',  exercises: buildPushSession(pool, params, emphasis) },
    { dayOfWeek: 5, label: 'Pull 2',  focusLabel: 'Pull',  exercises: buildPullSession(pool, params, emphasis) },
    { dayOfWeek: 6, label: 'Legs 2',  focusLabel: 'Legs',  exercises: buildLegsSession(pool, params, emphasis, 'hinge') },
  ]
}

const SPLIT_NAMES: Record<TrainingDays, string> = {
  3: 'Full Body (3-Day)',
  5: 'Upper/Lower (5-Day)',
  6: 'Push/Pull/Legs (6-Day)',
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generates a complete individualised weekly plan using the Master Key system.
 * Each session becomes a distinct day-named plan in the database.
 */
export function generateIndividualisedPlan(inputs: ProgramInputs): GeneratedPlan {
  const { goalType, emphasis, experienceLevel, availableEquipment, trainingDays } = inputs
  const params = VOLUME_MATRIX[experienceLevel][goalType]
  const pool = resolvePool(availableEquipment)

  const rawSessions = buildSplit(trainingDays, pool, params, emphasis)

  const sessions: GeneratedSession[] = rawSessions.map(s => ({
    dayOfWeek: s.dayOfWeek,
    label: s.label,
    focusLabel: s.focusLabel,
    exercises: s.exercises,
  }))

  const goalLabel = goalType.charAt(0).toUpperCase() + goalType.slice(1)
  const levelLabel = experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)
  const emphasisLabel = emphasis !== 'balanced' ? ` · ${emphasis.charAt(0).toUpperCase() + emphasis.slice(1)}` : ''
  const splitName = SPLIT_NAMES[trainingDays]

  return {
    title: `${levelLabel} ${goalLabel}${emphasisLabel}`,
    goalType,
    experienceLevel,
    trainingDays,
    splitName,
    sessions,
  }
}

// ─── Dexie Persistence — saves each session as a SEPARATE plan ───────────────

import { db } from '../../db/database'

/**
 * Saves the generated plan to the existing `plans` + `plan_exercises` tables.
 * Each training session becomes its own Plan row (e.g. "Push 1", "Lower A").
 * Returns array of saved plan IDs.
 */
export async function saveGeneratedPlan(plan: GeneratedPlan): Promise<number[]> {
  const allPlans = await db.plans.toArray()
  const maxSeq = allPlans.reduce((m, p) => Math.max(m, p.sequence), 0)

  const savedIds: number[] = []

  for (let i = 0; i < plan.sessions.length; i++) {
    const session = plan.sessions[i]
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayStr = String(session.dayOfWeek)
    const exercises = session.exercises.map(e => e.name)

    const planId = await db.plans.add({
      title: `${plan.title} — ${session.label}`,
      sequence: maxSeq + i + 1,
      days: dayStr,
      exercises: exercises.join(','),
    })

    let sortOrder = 0
    for (const ex of session.exercises) {
      await db.plan_exercises.add({
        planId: planId as number,
        exercise: ex.name,
        enabled: true,
        maxSets: ex.sets,
        sortOrder: sortOrder++,
        setType: 'normal',
      })
    }

    savedIds.push(planId as number)
  }

  return savedIds
}
