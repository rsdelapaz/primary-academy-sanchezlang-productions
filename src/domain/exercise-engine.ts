import type { GameExercise, SingleChoiceExercise, TypedAnswerExercise } from './content'

export interface SingleChoiceEvaluation {
  type: 'single_choice'
  exerciseId: string
  selectedOptionId: string
  correct: boolean
}

export interface TypedAnswerEvaluation {
  type: 'typed_answer'
  exerciseId: string
  submittedAnswer: string
  correct: boolean
}

export type AnswerEvaluation = SingleChoiceEvaluation | TypedAnswerEvaluation

export type GameAnswerResponse =
  | { type: 'single_choice'; optionId: string }
  | { type: 'typed_answer'; text: string }

export function evaluateSingleChoice(
  exercise: SingleChoiceExercise,
  selectedOptionId: string,
): SingleChoiceEvaluation {
  if (!exercise.options.some((option) => option.id === selectedOptionId)) {
    throw new Error(`Opción inexistente para ${exercise.id}.`)
  }
  return {
    type: 'single_choice',
    exerciseId: exercise.id,
    selectedOptionId,
    correct: selectedOptionId === exercise.correctOptionId,
  }
}

export function evaluateTypedAnswer(
  exercise: TypedAnswerExercise,
  submittedAnswer: string,
): TypedAnswerEvaluation {
  validateTypedAnswerExercise(exercise)
  if (typeof submittedAnswer !== 'string' || !normalizeTypedAnswer(submittedAnswer, true)) {
    throw new Error('La respuesta no puede estar vacía.')
  }
  const caseSensitive = exercise.caseSensitive ?? false
  const normalizedResponse = normalizeTypedAnswer(submittedAnswer, caseSensitive)
  return {
    type: 'typed_answer',
    exerciseId: exercise.id,
    submittedAnswer,
    correct: exercise.acceptedAnswers.some((answer) =>
      normalizeTypedAnswer(answer, caseSensitive) === normalizedResponse,
    ),
  }
}

export function evaluateGameAnswer(
  exercise: GameExercise,
  response: GameAnswerResponse,
): AnswerEvaluation {
  switch (exercise.type) {
    case 'single_choice':
      if (response.type !== 'single_choice') throw new Error('La respuesta no coincide con el tipo de ejercicio.')
      return evaluateSingleChoice(exercise, response.optionId)
    case 'typed_answer':
      if (response.type !== 'typed_answer') throw new Error('La respuesta no coincide con el tipo de ejercicio.')
      return evaluateTypedAnswer(exercise, response.text)
    default:
      return assertNever(exercise)
  }
}

export function normalizeTypedAnswer(value: string, caseSensitive = false): string {
  const normalized = value.normalize('NFC').trim()
  return caseSensitive ? normalized : normalized.toLowerCase()
}

export function validateTypedAnswerExercise(exercise: TypedAnswerExercise): void {
  if (!Array.isArray(exercise.acceptedAnswers) || exercise.acceptedAnswers.length === 0) {
    throw new Error(`El ejercicio ${exercise.id} requiere respuestas aceptadas.`)
  }
  if (exercise.caseSensitive !== undefined && typeof exercise.caseSensitive !== 'boolean') {
    throw new Error(`caseSensitive no es válido en ${exercise.id}.`)
  }
  const normalizedAnswers = exercise.acceptedAnswers.map((answer) =>
    typeof answer === 'string' ? normalizeTypedAnswer(answer, exercise.caseSensitive ?? false) : '',
  )
  if (normalizedAnswers.some((answer) => answer.length === 0)) {
    throw new Error(`Respuesta aceptada vacía en el ejercicio: ${exercise.id}.`)
  }
  if (new Set(normalizedAnswers).size !== normalizedAnswers.length) {
    throw new Error(`Respuestas aceptadas duplicadas tras normalización en el ejercicio: ${exercise.id}.`)
  }
}

function assertNever(value: never): never {
  throw new Error(`Tipo de ejercicio no soportado: ${JSON.stringify(value)}`)
}
