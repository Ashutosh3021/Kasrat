/** Radar / stats axes used on the Weekly Stats page */
export const RADAR_MUSCLE_AXES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const
export type RadarMuscleAxis = (typeof RADAR_MUSCLE_AXES)[number]

/**
 * Maps stored primaryMuscle values (exercise presets) to radar chart axes.
 * Presets use names like "Back & Traps" while charts use simplified "Back".
 */
export function toRadarMuscleAxis(primaryMuscle: string | undefined): RadarMuscleAxis | null {
  const muscle = primaryMuscle ?? 'Other'
  const map: Record<string, RadarMuscleAxis> = {
    Chest: 'Chest',
    'Back & Traps': 'Back',
    Back: 'Back',
    Legs: 'Legs',
    Shoulders: 'Shoulders',
    'Biceps & Forearms': 'Arms',
    Triceps: 'Arms',
    Arms: 'Arms',
    'Core & Neck': 'Core',
    Core: 'Core',
  }
  return map[muscle] ?? null
}
