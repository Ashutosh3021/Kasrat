/**
 * Feature 5: Training Phase Templates — Generator
 *
 * Determines goal from body composition and builds a personalised
 * weekly session plan with emphasis adjustments.
 */

import type {
  WizardInputs, WizardGoalType, WizardTemplate,
  WizardTemplateSession, WizardExercise,
} from './wizardTypes'

// ─── Goal Determination ───────────────────────────────────────────────────────

/**
 * Recommend a goal based on body fat percentage.
 * fat% > 25 → cut, fat% < 12 → bulk, otherwise → recomp
 */
export function recommendGoal(fatPercentage: number | null): WizardGoalType {
  if (fatPercentage === null) return 'recomp'
  if (fatPercentage > 25) return 'cut'
  if (fatPercentage < 12) return 'bulk'
  return 'recomp'
}

// ─── Base Exercise Pool ───────────────────────────────────────────────────────

interface BaseExercise {
  name: string
  muscle: string
  category: 'push' | 'pull' | 'legs'
  tier: 1 | 2  // 1=primary, 2=secondary
}

const BASE_EXERCISES: BaseExercise[] = [
  // Push
  { name: 'Flat bench press (Barbell)', muscle: 'Chest', category: 'push', tier: 1 },
  { name: 'Incline bench press (Dumbbell)', muscle: 'Chest', category: 'push', tier: 1 },
  { name: 'Cable fly', muscle: 'Chest', category: 'push', tier: 2 },
  { name: 'Overhead press (Dumbbell)', muscle: 'Shoulders', category: 'push', tier: 1 },
  { name: 'Lateral raise (Dumbbell)', muscle: 'Shoulders', category: 'push', tier: 2 },
  { name: 'Cable push down', muscle: 'Triceps', category: 'push', tier: 2 },
  { name: 'Skull crusher', muscle: 'Triceps', category: 'push', tier: 2 },
  // Pull
  { name: 'Pull-ups', muscle: 'Back & Traps', category: 'pull', tier: 1 },
  { name: 'Barbell row', muscle: 'Back & Traps', category: 'pull', tier: 1 },
  { name: 'Lat pull downs', muscle: 'Back & Traps', category: 'pull', tier: 2 },
  { name: 'Chest supported row (machine)', muscle: 'Back & Traps', category: 'pull', tier: 2 },
  { name: 'Face pull', muscle: 'Shoulders', category: 'pull', tier: 2 },
  { name: 'Barbell curl', muscle: 'Biceps & Forearms', category: 'pull', tier: 1 },
  { name: 'Hammer curl', muscle: 'Biceps & Forearms', category: 'pull', tier: 2 },
  // Legs
  { name: 'Squat (Regular)', muscle: 'Legs', category: 'legs', tier: 1 },
  { name: 'Romanian deadlift', muscle: 'Legs', category: 'legs', tier: 1 },
  { name: 'Leg extensions', muscle: 'Legs', category: 'legs', tier: 2 },
  { name: 'Hamstring curl (Seated)', muscle: 'Legs', category: 'legs', tier: 2 },
  { name: 'Hip thrust', muscle: 'Legs', category: 'legs', tier: 2 },
  { name: 'Calf raise (Standing)', muscle: 'Legs', category: 'legs', tier: 2 },
]

// ─── Rep Ranges per Goal ──────────────────────────────────────────────────────

const REP_RANGES: Record<WizardGoalType, { min: number; max: number; sets: number }> = {
  bulk: { min: 6, max: 10, sets: 4 },
  cut: { min: 10, max: 15, sets: 3 },
  recomp: { min: 8, max: 12, sets: 3 },
}

// ─── Volume Multipliers per Emphasis ─────────────────────────────────────────

function applyEmphasis(
  exercises: WizardExercise[],
  emphasis: WizardInputs['emphasis'],
  category: 'push' | 'pull' | 'legs',
): WizardExercise[] {
  const emphasisMap: Record<WizardInputs['emphasis'], string[]> = {
    arms: ['Biceps & Forearms', 'Triceps'],
    chest: ['Chest'],
    back: ['Back & Traps'],
    legs: ['Legs'],
    balanced: [],
  }
  const targetMuscles = emphasisMap[emphasis]
  if (targetMuscles.length === 0) return exercises

  // Add extra set to exercises in the emphasis muscle group
  const updated = exercises.map(ex => {
    const isTarget = targetMuscles.some(m => ex.primaryMuscle.includes(m))
    return isTarget ? { ...ex, sets: ex.sets + 1 } : ex
  })

  // For arms emphasis on push day, append extra tricep exercise
  if (emphasis === 'arms' && category === 'push') {
    updated.push({
      name: 'Dumbbell overhead extension',
      sets: 3,
      repMin: 10,
      repMax: 15,
      primaryMuscle: 'Triceps',
    })
  }
  // Extra chest exercise for chest emphasis
  if (emphasis === 'chest' && category === 'push') {
    updated.push({
      name: 'Machine pec deck',
      sets: 3,
      repMin: 12,
      repMax: 15,
      primaryMuscle: 'Chest',
    })
  }
  // Extra bicep for arms on pull day
  if (emphasis === 'arms' && category === 'pull') {
    updated.push({
      name: 'Concentration curl',
      sets: 3,
      repMin: 10,
      repMax: 15,
      primaryMuscle: 'Biceps & Forearms',
    })
  }
  // Extra leg exercise for legs emphasis
  if (emphasis === 'legs' && category === 'legs') {
    updated.push({
      name: 'Bulgarian split squat',
      sets: 3,
      repMin: 8,
      repMax: 12,
      primaryMuscle: 'Legs',
    })
  }

  return updated
}

// ─── Session Builder ──────────────────────────────────────────────────────────

function buildSession(
  category: 'push' | 'pull' | 'legs',
  goal: WizardGoalType,
  emphasis: WizardInputs['emphasis'],
): WizardExercise[] {
  const pool = BASE_EXERCISES.filter(e => e.category === category)
  const { min, max, sets } = REP_RANGES[goal]

  const exercises: WizardExercise[] = pool.map(e => ({
    name: e.name,
    sets: e.tier === 1 ? sets : Math.max(2, sets - 1),
    repMin: min,
    repMax: max,
    primaryMuscle: e.muscle,
  }))

  return applyEmphasis(exercises, emphasis, category)
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generates a full PPL (Push-Pull-Legs) weekly template from wizard inputs.
 */
export function generateTemplate(inputs: WizardInputs): WizardTemplate {
  const goalType = recommendGoal(inputs.fatPercentage)
  const { emphasis } = inputs

  const sessions: WizardTemplateSession[] = [
    {
      day: 1, // Monday
      label: 'Push',
      exercises: buildSession('push', goalType, emphasis),
    },
    {
      day: 2, // Tuesday
      label: 'Pull',
      exercises: buildSession('pull', goalType, emphasis),
    },
    {
      day: 3, // Wednesday
      label: 'Legs',
      exercises: buildSession('legs', goalType, emphasis),
    },
    {
      day: 4, // Thursday — rest (no exercises)
      label: 'Rest',
      exercises: [],
    },
    {
      day: 5, // Friday
      label: 'Push',
      exercises: buildSession('push', goalType, emphasis),
    },
    {
      day: 6, // Saturday
      label: 'Pull',
      exercises: buildSession('pull', goalType, emphasis),
    },
    {
      day: 7, // Sunday
      label: 'Legs',
      exercises: buildSession('legs', goalType, emphasis),
    },
  ]

  const emphasisLabel = emphasis === 'balanced' ? '' : ` – ${emphasis.charAt(0).toUpperCase() + emphasis.slice(1)} Focus`
  const goalLabel = goalType.charAt(0).toUpperCase() + goalType.slice(1)

  return {
    id: `wizard-${Date.now()}`,
    name: `${goalLabel}${emphasisLabel}`,
    goalType,
    emphasis,
    sessions,
    createdAt: new Date().toISOString(),
  }
}
