export type ExerciseType = 'single_choice'

export interface ExerciseOption {
  id: string
  label: string
}

export interface Exercise {
  id: string
  type: ExerciseType
  prompt: string
  context: string
  options: ExerciseOption[]
  correctOptionId: string
  explanation: string
}
