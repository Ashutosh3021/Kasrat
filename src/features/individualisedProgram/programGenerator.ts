/**
 * Feature 12: Individualised Program Generation
 *
 * Extends the wizard from Feature 5 to factor in:
 * - Experience level (beginner / intermediate / advanced)
 * - Available equipment
 * - Muscle emphasis
 * - Goal type (via Feature 1 modifiers)
 *
 * Produces a `GeneratedPlan` structure that maps 1:1 to the existing
 * `Plan` + `PlanExercise` Dexie tables, so it can be saved without
 * touching any existing code.
 */

import type { WizardGoalType, WizardEmphasis } from '../trainingPhaseTemplates/wizardTypes'
import { generateTemplate } from '../trainingPhaseTemplates/templateGenerator'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type EquipmentType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable'

export interface ProgramInputs {
  goalType: WizardGoalType
  emphasis: WizardEmphasis
  experienceLevel: ExperienceLevel
  availableEquipment: EquipmentType[]
  fatPercentage?: number
  bodyWeight?: number
}

export interface GeneratedExercise {
  name: string
  sets: number
  repMin: number
  repMax: number
  restSeconds: number
  primaryMuscle: string
  priorityLevel: 'primary' | 'secondary'
}

export interface GeneratedSession {
  dayOfWeek: number   // 0=Sun … 6=Sat
  label: string
  exercises: GeneratedExercise[]
}

export interface GeneratedPlan {
  title: string
  goalType: WizardGoalType
  experienceLevel: ExperienceLevel
  sessions: GeneratedSession[]
}

// ─── Experience Scaling ───────────────────────────────────────────────────────

interface ExperienceParams {
  setsBase: number
  repMin: number
  repMax: number
  restSeconds: number
}

const EXPERIENCE_PARAMS: Record<ExperienceLevel, ExperienceParams> = {
  beginner: { setsBase: 3, repMin: 8, repMax: 12, restSeconds: 90 },
  intermediate: { setsBase: 4, repMin: 6, repMax: 10, restSeconds: 75 },
  advanced: { setsBase: 5, repMin: 4, repMax: 8, restSeconds: 45 },
}

// ─── Equipment Swap Table ─────────────────────────────────────────────────────

/**
 * Maps exercises requiring unavailable equipment to fallback variants.
 */
const EQUIPMENT_SWAPS: Record<string, Record<EquipmentType, string | null>> = {
  'Flat bench press (Barbell)': {
    barbell: 'Flat bench press (Barbell)',
    dumbbell: 'Flat bench press (Dumbbell)',
    machine: 'Machine pec deck',
    bodyweight: 'Push-ups',
    cable: 'Cable fly',
  },
  'Overhead press (Barbell)': {
    barbell: 'Overhead press (Barbell)',
    dumbbell: 'Overhead press (Dumbbell)',
    machine: 'Lateral raise (Machine)',
    bodyweight: 'Push-ups',
    cable: 'Lateral raise (Cable)',
  },
  'Barbell row': {
    barbell: 'Barbell row',
    dumbbell: 'Meadows row',
    machine: 'Chest supported row (machine)',
    bodyweight: 'Pull-ups',
    cable: 'Lat pull downs',
  },
  'Squat (Regular)': {
    barbell: 'Squat (Regular)',
    dumbbell: 'Bulgarian split squat',
    machine: 'Hack squat',
    bodyweight: 'Sissy squats',
    cable: 'Hack squat',
  },
}

function swapForEquipment(
  exerciseName: string,
  available: EquipmentType[],
): string {
  const swapTable = EQUIPMENT_SWAPS[exerciseName]
  if (!swapTable) return exerciseName

  // Prefer barbell > dumbbell > machine > cable > bodyweight
  const priority: EquipmentType[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']
  for (const eq of priority) {
    if (available.includes(eq) && swapTable[eq]) {
      return swapTable[eq]!
    }
  }
  // Bodyweight is always available as last resort
  return swapTable.bodyweight ?? exerciseName
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generates a complete individualised weekly plan.
 * Returns a structure ready to be persisted to Dexie `plans` + `plan_exercises`.
 */
export function generateIndividualisedPlan(inputs: ProgramInputs): GeneratedPlan {
  const { goalType, emphasis, experienceLevel, availableEquipment } = inputs
  const params = EXPERIENCE_PARAMS[experienceLevel]

  // Use the wizard template generator as the base
  const base = generateTemplate({
    fatPercentage: inputs.fatPercentage ?? null,
    bodyWeight: inputs.bodyWeight ?? null,
    emphasis,
  })

  const sessions: GeneratedSession[] = base.sessions
    .filter(s => s.exercises.length > 0)
    .map(s => {
      const exercises: GeneratedExercise[] = s.exercises.map((ex, idx) => ({
        name: swapForEquipment(ex.name, availableEquipment),
        sets: Math.max(2, params.setsBase + (idx === 0 ? 1 : 0)), // first exercise gets extra set
        repMin: params.repMin,
        repMax: params.repMax,
        restSeconds: params.restSeconds,
        primaryMuscle: ex.primaryMuscle,
        priorityLevel: idx < 2 ? 'primary' : 'secondary',
      }))
      return { dayOfWeek: s.day % 7, label: s.label, exercises }
    })

  const goalLabel = goalType.charAt(0).toUpperCase() + goalType.slice(1)
  const levelLabel = experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)

  return {
    title: `${levelLabel} ${goalLabel} PPL`,
    goalType,
    experienceLevel,
    sessions,
  }
}

// ─── Dexie Persistence Helper ─────────────────────────────────────────────────

import { db } from '../../db/database'

/**
 * Saves the generated plan to the existing `plans` + `plan_exercises` tables.
 * Returns the new plan's ID.
 */
export async function saveGeneratedPlan(plan: GeneratedPlan): Promise<number> {
  // Map session days to a comma-separated days string (0=Sun…6=Sat)
  const days = plan.sessions.map(s => s.dayOfWeek).join(',')
  // Collect all unique exercise names
  const allExercises = Array.from(
    new Set(plan.sessions.flatMap(s => s.exercises.map(e => e.name))),
  )

  // Find next sequence
  const allPlans = await db.plans.toArray()
  const maxSeq = allPlans.reduce((m, p) => Math.max(m, p.sequence), 0)

  const planId = await db.plans.add({
    title: plan.title,
    sequence: maxSeq + 1,
    days,
    exercises: allExercises.join(','),
  })

  // Add plan_exercises with set metadata encoded in maxSets
  let sortOrder = 0
  for (const session of plan.sessions) {
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
  }

  return planId as number
}
