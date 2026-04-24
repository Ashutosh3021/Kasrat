export interface TemplateExercise {
  name: string
  sets: number
  repsMin?: number
  repsMax?: number
  notes?: string
}

export interface ProgramDay {
  dayLabel: string
  exercises: TemplateExercise[]
}

export interface ProgramTemplate {
  id: string
  name: string
  description?: string
  days: ProgramDay[]
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'ppl-up-5',
    name: 'PPL UP (5 Days)',
    description: '5-day Upper/Lower Push Pull Legs split',
    days: [
      {
        dayLabel: 'Day 1: Push',
        exercises: [
          { name: 'Bench Press (Barbell)',          sets: 3, repsMin: 6,  repsMax: 10 },
          { name: 'Shoulder Press (Dumbbell)',       sets: 3, repsMin: 10, repsMax: 12 },
          { name: 'Low Cable Fly Crossovers',        sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Triceps Extension (Dumbbell)',    sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Triceps Rope Pushdown',           sets: 3, repsMin: 12, repsMax: 15 },
        ],
      },
      {
        dayLabel: 'Day 2: Pull',
        exercises: [
          { name: 'Bent Over Row (Barbell)',         sets: 3, repsMin: 6,  repsMax: 10 },
          { name: 'Lat Pulldown (Cable)',            sets: 3, repsMin: 8,  repsMax: 12 },
          { name: 'Bicep Curl (Dumbbell)',           sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Hammer Curl (Dumbbell)',          sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Face Pull',                       sets: 3, repsMin: 15, repsMax: 25 },
        ],
      },
      {
        dayLabel: 'Day 3: Legs',
        exercises: [
          { name: 'Squat (Barbell)',                 sets: 3, repsMin: 6,  repsMax: 10 },
          { name: 'Glute Ham Raise',                 sets: 3, repsMin: 8,  repsMax: 12 },
          { name: 'Lunge (Dumbbell)',                sets: 3, repsMin: 10, repsMax: 15, notes: 'per side' },
          { name: 'Lying Leg Curl (Machine)',        sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Standing Calf Raise (Smith)',     sets: 3, repsMin: 8,  repsMax: 12 },
        ],
      },
      {
        dayLabel: 'Day 4: Upper',
        exercises: [
          { name: 'Pull Up',                         sets: 3, repsMin: 5,  repsMax: 10 },
          { name: 'Incline Bench Press (Dumbbell)',  sets: 3, repsMin: 8,  repsMax: 10 },
          { name: 'Straight Arm Lat Pulldown (Cable)', sets: 3, repsMin: 10, repsMax: 15 },
          { name: 'Seated Shoulder Press (Machine)', sets: 3, repsMin: 10, repsMax: 12 },
          { name: 'Push Up',                         sets: 2, repsMin: 12, repsMax: 20 },
        ],
      },
      {
        dayLabel: 'Day 5: Lower',
        exercises: [
          { name: 'Leg Press (Machine)',             sets: 3, repsMin: 8,  repsMax: 12 },
          { name: 'Romanian Deadlift (Barbell)',     sets: 3, repsMin: 8,  repsMax: 10 },
          { name: 'Leg Extension (Machine)',         sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Seated Calf Raise',               sets: 4, repsMin: 12, repsMax: 20 },
          { name: 'Cable Crunch',                    sets: 4, repsMin: 12, repsMax: 15 },
        ],
      },
    ],
  },
  {
    id: 'ppl-3',
    name: 'PPL (3 Days)',
    description: 'Classic 3-day Push Pull Legs split',
    days: [
      {
        dayLabel: 'Day 1: Push',
        exercises: [
          { name: 'Bench Press (Barbell)',          sets: 3, repsMin: 6,  repsMax: 10 },
          { name: 'Shoulder Press (Dumbbell)',       sets: 3, repsMin: 10, repsMax: 12 },
          { name: 'Low Cable Fly Crossovers',        sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Triceps Extension (Dumbbell)',    sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Triceps Rope Pushdown',           sets: 3, repsMin: 12, repsMax: 15 },
        ],
      },
      {
        dayLabel: 'Day 2: Pull',
        exercises: [
          { name: 'Bent Over Row (Barbell)',         sets: 3, repsMin: 6,  repsMax: 10 },
          { name: 'Lat Pulldown (Cable)',            sets: 3, repsMin: 8,  repsMax: 12 },
          { name: 'Bicep Curl (Dumbbell)',           sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Hammer Curl (Dumbbell)',          sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Face Pull',                       sets: 3, repsMin: 15, repsMax: 25 },
        ],
      },
      {
        dayLabel: 'Day 3: Legs',
        exercises: [
          { name: 'Squat (Barbell)',                 sets: 3, repsMin: 6,  repsMax: 10 },
          { name: 'Glute Ham Raise',                 sets: 3, repsMin: 8,  repsMax: 12 },
          { name: 'Lunge (Dumbbell)',                sets: 3, repsMin: 10, repsMax: 15, notes: 'per side' },
          { name: 'Lying Leg Curl (Machine)',        sets: 3, repsMin: 12, repsMax: 15 },
          { name: 'Standing Calf Raise (Smith)',     sets: 3, repsMin: 8,  repsMax: 12 },
        ],
      },
    ],
  },
]
