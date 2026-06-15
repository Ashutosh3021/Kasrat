/**
 * Feature 5: Training Phase Templates — Shared Types
 *
 * All types used by the wizard, template generator, and store.
 */

export type WizardGoalType = 'bulk' | 'cut' | 'recomp'
export type WizardEmphasis = 'balanced' | 'arms' | 'chest' | 'back' | 'legs'

export interface WizardInputs {
  /** User's estimated body fat percentage (0–60) */
  fatPercentage: number | null
  /** Body weight in kg */
  bodyWeight: number | null
  /** Which muscle group(s) to emphasise */
  emphasis: WizardEmphasis
}

export interface WizardTemplateSession {
  day: number   // 1=Mon … 7=Sun
  label: string // 'Push', 'Pull', 'Legs', etc.
  exercises: WizardExercise[]
}

export interface WizardExercise {
  name: string
  sets: number
  repMin: number
  repMax: number
  primaryMuscle: string
}

export interface WizardTemplate {
  id: string         // uuid-like generated key
  name: string       // 'Custom Bulk – Arms Focus'
  goalType: WizardGoalType
  emphasis: WizardEmphasis
  sessions: WizardTemplateSession[]
  createdAt: string  // ISO
}
