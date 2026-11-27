import { isGameExercise, type ContentPackage, type GameExercise } from './content'
import type { AnswerEvaluation } from './exercise-engine'
import type { GameSession, SessionAnswer, SessionQuestion } from './game'
import { fisherYates, type RandomSource } from './random'

export type TrainingItem = {
  original: SessionQuestion
  answer: SessionAnswer
  practice: SessionQuestion
  isVariant: boolean
}

/**
 * Prepare a separate, non-scoring activity from the mistakes of a completed game.
 * Preserve the original review order and prefer exercises not seen in that game.
 * If the original content version is unavailable, the saved question is sufficient.
 */
export function createTrainingItems(
  game: GameSession,
  content?: ContentPackage | null,
  random: RandomSource = Math.random,
): TrainingItem[] {
  if (game.status !== 'completed') throw new Error('Termina la partida antes de revisar sus errores.')

  const bank = content && content.subjectId === game.subjectId && content.topicId === game.topicId &&
    content.contentVersion === game.contentVersion
    ? content.exercises.filter(isGameExercise)
    : []
  const questions = new Map(game.questions.map((question) => [question.exercise.id, question]))
  // A different identifier alone does not make an exercise new to the player.
  const seenIds = new Set(questions.keys())
  const seenPrompts = new Set(game.questions.map(({ exercise }) => visiblePromptKey(exercise)))
  const items: TrainingItem[] = []

  for (const answer of game.answers) {
    if (answer.correct) continue
    const original = questions.get(answer.exerciseId)
    if (!original || original.type !== answer.type) {
      throw new Error('La respuesta no coincide con la pregunta revisada.')
    }

    const candidates = bank.filter((exercise) =>
      exercise.conceptId === original.exercise.conceptId &&
      exercise.type === original.exercise.type &&
      exercise.difficulty === original.exercise.difficulty &&
      equalObjectiveSets(exercise.learningObjectiveIds, original.exercise.learningObjectiveIds) &&
      !seenIds.has(exercise.id) &&
      !seenPrompts.has(visiblePromptKey(exercise)),
    )
    const variant = fisherYates(candidates, random)[0]
    if (variant) {
      seenIds.add(variant.id)
      seenPrompts.add(visiblePromptKey(variant))
    }

    items.push({
      original: copySessionQuestion(original),
      answer: { ...answer },
      practice: makePracticeQuestion(variant ?? original.exercise, random),
      isVariant: Boolean(variant),
    })
  }

  return items
}

export function trainingAnswerText(question: SessionQuestion, answer: AnswerEvaluation): string {
  if (question.exercise.id !== answer.exerciseId) throw new Error('La respuesta no corresponde a esta pregunta.')
  if (question.type === 'typed_answer' && answer.type === 'typed_answer') return answer.submittedAnswer
  if (question.type === 'single_choice' && answer.type === 'single_choice') {
    const selected = question.exercise.options.find(({ id }) => id === answer.selectedOptionId)
    if (selected) return selected.text
  }
  throw new Error('La respuesta no coincide con la pregunta revisada.')
}

export function trainingCorrectText(question: SessionQuestion): string {
  if (question.type === 'typed_answer') return question.exercise.acceptedAnswers.join(' / ')
  const correct = question.exercise.options.find(({ id }) => id === question.exercise.correctOptionId)
  if (!correct) throw new Error('La pregunta revisada no tiene una opción correcta.')
  return correct.text
}

function equalObjectiveSets(left: readonly string[], right: readonly string[]): boolean {
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  return leftSet.size === rightSet.size && [...leftSet].every((id) => rightSet.has(id))
}

function visiblePromptKey(exercise: GameExercise): string {
  const normalize = (text: string) => text.normalize('NFC').trim().replace(/\s+/g, ' ')
  return JSON.stringify([normalize(exercise.prompt), normalize(exercise.context ?? '')])
}

function copyExercise(exercise: GameExercise): GameExercise {
  const shared = {
    learningObjectiveIds: [...exercise.learningObjectiveIds],
    tags: [...exercise.tags],
    ...(exercise.hints ? { hints: [...exercise.hints] } : {}),
    ...(exercise.media ? { media: exercise.media.map((resource) => ({ ...resource })) } : {}),
  }
  if (exercise.type === 'typed_answer') {
    return { ...exercise, ...shared, acceptedAnswers: [...exercise.acceptedAnswers] }
  }
  return {
    ...exercise,
    ...shared,
    options: exercise.options.map((option) => ({ ...option })),
    ...(exercise.answerVariants ? { answerVariants: [...exercise.answerVariants] } : {}),
  }
}

function copySessionQuestion(question: SessionQuestion): SessionQuestion {
  const exercise = copyExercise(question.exercise)
  if (question.type === 'single_choice' && exercise.type === 'single_choice') {
    return { type: exercise.type, exercise, optionIds: [...question.optionIds] }
  }
  if (exercise.type === 'typed_answer') return { type: exercise.type, exercise }
  throw new Error('El tipo de pregunta no coincide con su ejercicio.')
}

function makePracticeQuestion(exercise: GameExercise, random: RandomSource): SessionQuestion {
  const copied = copyExercise(exercise)
  return copied.type === 'single_choice'
    ? { type: copied.type, exercise: copied, optionIds: fisherYates(copied.options.map(({ id }) => id), random) }
    : { type: copied.type, exercise: copied }
}
