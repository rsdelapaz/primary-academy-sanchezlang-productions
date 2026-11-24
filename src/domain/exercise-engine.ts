import type { SingleChoiceExercise } from './content'

export interface AnswerEvaluation {
  exerciseId: string
  selectedOptionId: string
  correct: boolean
}

export function evaluateSingleChoice(
  exercise: SingleChoiceExercise,
  selectedOptionId: string,
): AnswerEvaluation {
  if (!exercise.options.some((option) => option.id === selectedOptionId)) {
    throw new Error(`Opción inexistente para ${exercise.id}.`)
  }
  return {
    exerciseId: exercise.id,
    selectedOptionId,
    correct: selectedOptionId === exercise.correctOptionId,
  }
}
