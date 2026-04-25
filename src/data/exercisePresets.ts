export type MuscleGroup = 
  | 'Biceps & Forearms'
  | 'Triceps'
  | 'Chest'
  | 'Back & Traps'
  | 'Shoulders'
  | 'Legs'
  | 'Core & Neck'

export interface ExercisePreset {
  name: string
  primaryMuscle: MuscleGroup
  secondaryMuscle: string | null
  type: 'strength'
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  // Biceps & Forearms
  { name: 'Barbell curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'EZ bar curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Dumbbell curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Hammer curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Palms-down curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Preacher curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Concentration curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Bayesian cable curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Incline dumbbell curl', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Dumbbell wrist curls', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },
  { name: 'Wrist extensions', primaryMuscle: 'Biceps & Forearms', secondaryMuscle: null, type: 'strength' },

  // Triceps
  { name: 'Cable push down', primaryMuscle: 'Triceps', secondaryMuscle: null, type: 'strength' },
  { name: 'Diamond push-ups', primaryMuscle: 'Triceps', secondaryMuscle: null, type: 'strength' },
  { name: 'Skull crusher', primaryMuscle: 'Triceps', secondaryMuscle: null, type: 'strength' },
  { name: 'Dumbbell overhead extension', primaryMuscle: 'Triceps', secondaryMuscle: null, type: 'strength' },
  { name: 'JM press', primaryMuscle: 'Triceps', secondaryMuscle: null, type: 'strength' },
  { name: 'Cable overhead extension', primaryMuscle: 'Triceps', secondaryMuscle: null, type: 'strength' },
  { name: 'Tricep kickbacks', primaryMuscle: 'Triceps', secondaryMuscle: null, type: 'strength' },

  // Chest
  { name: 'Flat bench press (Barbell)', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Flat bench press (Dumbbell)', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Push-ups', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Incline bench press (Barbell)', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Incline bench press (Dumbbell)', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Incline bench press (Smith machine)', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Decline push-ups', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Cable fly', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Dumbbell fly', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Machine pec deck', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },
  { name: 'Weighted dips', primaryMuscle: 'Chest', secondaryMuscle: null, type: 'strength' },

  // Back & Traps
  { name: 'Pull-ups', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Lat pull downs', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Dumbbell pullover', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Machine lat pullover', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Barbell row', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Meadows row', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Seal row', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Chest supported row (T-bar)', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Chest supported row (machine)', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Dumbbell shrugs', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },
  { name: 'Kelso shrugs', primaryMuscle: 'Back & Traps', secondaryMuscle: null, type: 'strength' },

  // Shoulders
  { name: 'Overhead press (Barbell)', primaryMuscle: 'Shoulders', secondaryMuscle: null, type: 'strength' },
  { name: 'Overhead press (Dumbbell)', primaryMuscle: 'Shoulders', secondaryMuscle: null, type: 'strength' },
  { name: 'Lateral raise (Dumbbell)', primaryMuscle: 'Shoulders', secondaryMuscle: null, type: 'strength' },
  { name: 'Lateral raise (Cable)', primaryMuscle: 'Shoulders', secondaryMuscle: null, type: 'strength' },
  { name: 'Lateral raise (Machine)', primaryMuscle: 'Shoulders', secondaryMuscle: null, type: 'strength' },
  { name: 'Rear delt fly', primaryMuscle: 'Shoulders', secondaryMuscle: null, type: 'strength' },
  { name: 'Reverse pec deck', primaryMuscle: 'Shoulders', secondaryMuscle: null, type: 'strength' },
  { name: 'Face pull', primaryMuscle: 'Shoulders', secondaryMuscle: null, type: 'strength' },

  // Legs
  { name: 'Squat (Regular)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Squat (Smith machine)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Hack squat', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Pendulum squat', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Leg extensions', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Reverse Nordics', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Sissy squats', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Bulgarian split squat', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Walking lunges', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Stationary lunges', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Hamstring curl (Seated)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Hamstring curl (Lying)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Nordic hamstring curl', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Romanian deadlift', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Conventional deadlift', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Sumo deadlift', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Good morning', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: '45-degree back extension', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Hip thrust', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Nautilus glute drive', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Calf raise (Standing)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Calf raise (Seated)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Calf raise (Elevated)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Calf raise (Smith machine)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },
  { name: 'Calf raise (Leg press)', primaryMuscle: 'Legs', secondaryMuscle: null, type: 'strength' },

  // Core & Neck
  { name: 'Cable crunch', primaryMuscle: 'Core & Neck', secondaryMuscle: null, type: 'strength' },
  { name: 'Machine crunch', primaryMuscle: 'Core & Neck', secondaryMuscle: null, type: 'strength' },
  { name: 'Weighted situps', primaryMuscle: 'Core & Neck', secondaryMuscle: null, type: 'strength' },
  { name: 'Neck curls', primaryMuscle: 'Core & Neck', secondaryMuscle: null, type: 'strength' },
  { name: 'Neck extensions', primaryMuscle: 'Core & Neck', secondaryMuscle: null, type: 'strength' },
]

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Biceps & Forearms',
  'Triceps',
  'Chest',
  'Back & Traps',
  'Shoulders',
  'Legs',
  'Core & Neck',
]
