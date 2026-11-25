import type { ExerciseDifficulty, SingleChoiceExercise } from './content'
import { fisherYates, type RandomSource } from './random'
import { evaluateSingleChoice } from './exercise-engine'
import { pointsForEvaluation, SCORING_VERSION } from './scoring'

export type GameModeId = 'classic'
export type GameStatus = 'active' | 'abandoned' | 'completed'
export type GamePhase = 'answering' | 'feedback'
export type DurationPreset = 'short' | 'medium' | 'long'
export type DifficultyFilter = ExerciseDifficulty | 'all'

export interface GameConfiguration {
  duration: { kind: 'preset'; preset: DurationPreset; questionCount: number }
    | { kind: 'custom'; questionCount: number }
  difficulty: DifficultyFilter
}

export interface SessionQuestion {
  exercise: SingleChoiceExercise
  optionIds: string[]
}

export interface SessionAnswer {
  exerciseId: string
  selectedOptionId: string
  correct: boolean
  points: number
}

export interface GameResult {
  sessionId: string
  subjectId: string
  topicId: string
  modeId: GameModeId
  durationKind: 'short' | 'medium' | 'long' | 'custom'
  questionCount: number
  difficulty: ExerciseDifficulty | 'mixed'
  configurationKey: string
  contentVersion: string
  scoringVersion: string
  score: number
  correctCount: number
  totalQuestions: number
  startedAt: string
  finishedAt: string
}

export interface GameSession {
  id: string
  status: GameStatus
  phase: GamePhase
  subjectId: string
  topicId: string
  contentVersion: string
  modeId: GameModeId
  configuration: GameConfiguration
  questions: SessionQuestion[]
  answers: SessionAnswer[]
  currentQuestionIndex: number
  score: number
  startedAt: string
  result: GameResult | null
}

export interface GameStats {
  score: number
  correctCount: number
  answeredCount: number
  totalQuestions: number
  currentStreak: number
  bestStreak: number
  progressPercent: number
}

export interface CreateSessionInput {
  sessionId: string
  subjectId: string
  topicId: string
  contentVersion: string
  modeId: string
  configuration: GameConfiguration
  exercises: readonly SingleChoiceExercise[]
  random?: RandomSource
  startedAt?: string
}

export const DURATION_PRESETS = [
  { id: 'short', title: 'Corta', count: 5 },
  { id: 'medium', title: 'Media', count: 10 },
  { id: 'long', title: 'Larga', count: 20 },
] as const

export const GAME_MODES = [{ id: 'classic' as const, title: 'Reto Relámpago', exerciseTypes: ['single_choice'] as const }]
export const QUICK_PLAY_COUNT = 10

export function getPresetCount(preset: DurationPreset): number {
  const definition = DURATION_PRESETS.find(({ id }) => id === preset)
  if (!definition) throw new Error(`Duración predefinida desconocida: ${preset}`)
  return definition.count
}

export function getEligibleExercises(
  exercises: readonly SingleChoiceExercise[],
  difficulty: DifficultyFilter,
): SingleChoiceExercise[] {
  return exercises.filter((exercise) => difficulty === 'all' || exercise.difficulty === difficulty)
}

export function createGameSession(input: CreateSessionInput): GameSession {
  if (input.modeId !== 'classic') throw new Error(`Modalidad no operativa: ${input.modeId}`)
  if (!input.sessionId.trim() || !input.subjectId.trim() || !input.topicId.trim() || !input.contentVersion.trim()) {
    throw new Error('La sesión requiere IDs y versión de contenido.')
  }
  const count = input.configuration.duration.questionCount
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('La duración debe ser un entero positivo.')
  if (input.configuration.duration.kind === 'preset' &&
    count !== getPresetCount(input.configuration.duration.preset)) {
    throw new Error('La cantidad no coincide con la duración predefinida.')
  }
  const eligible = getEligibleExercises(input.exercises, input.configuration.difficulty)
  if (new Set(eligible.map((exercise) => exercise.id)).size !== eligible.length) {
    throw new Error('El banco contiene identificadores de ejercicios duplicados.')
  }
  if (count > eligible.length) throw new Error('La partida no puede superar los ejercicios compatibles disponibles.')
  if (eligible.some((exercise) => exercise.type !== 'single_choice')) {
    throw new Error('La modalidad clásica solo admite single_choice.')
  }
  for (const exercise of eligible) {
    const ids = exercise.options.map((option) => option.id)
    if (ids.length < 2 || new Set(ids).size !== ids.length || !ids.includes(exercise.correctOptionId)) {
      throw new Error(`Ejercicio single_choice inválido: ${exercise.id}`)
    }
  }

  const random = input.random ?? Math.random
  const selected = fisherYates(eligible, random).slice(0, count)
  const questions = selected.map((exercise) => ({
    exercise: copyExercise(exercise),
    optionIds: fisherYates(exercise.options.map(({ id }) => id), random),
  }))
  const configuration: GameConfiguration = {
    difficulty: input.configuration.difficulty,
    duration: { ...input.configuration.duration },
  }

  return {
    id: input.sessionId,
    status: 'active',
    phase: 'answering',
    subjectId: input.subjectId,
    topicId: input.topicId,
    contentVersion: input.contentVersion,
    modeId: 'classic',
    configuration,
    questions,
    answers: [],
    currentQuestionIndex: 0,
    score: 0,
    startedAt: input.startedAt ?? new Date().toISOString(),
    result: null,
  }
}

export function getCurrentQuestion(current: GameSession): SessionQuestion | undefined {
  return current.questions[current.currentQuestionIndex]
}

export function getGameStats(current: GameSession): GameStats {
  let currentStreak = 0
  let bestStreak = 0
  let correctCount = 0
  for (const answer of current.answers) {
    if (answer.correct) {
      currentStreak += 1
      correctCount += 1
      bestStreak = Math.max(bestStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }
  return {
    score: current.score,
    correctCount,
    answeredCount: current.answers.length,
    totalQuestions: current.questions.length,
    currentStreak,
    bestStreak,
    progressPercent: Math.round((current.answers.length / current.questions.length) * 100),
  }
}

export function answerQuestion(
  current: GameSession,
  exerciseId: string,
  selectedOptionId: string,
): GameSession {
  assertActive(current)
  if (current.phase !== 'answering') throw new Error('La pregunta actual ya fue respondida.')
  const question = getCurrentQuestion(current)
  if (!question || question.exercise.id !== exerciseId) throw new Error('El identificador no corresponde a la pregunta actual.')
  const evaluation = evaluateSingleChoice(question.exercise, selectedOptionId)
  const points = pointsForEvaluation(evaluation.correct)
  return {
    ...current,
    phase: 'feedback',
    answers: [...current.answers, { ...evaluation, points }],
    score: current.score + points,
  }
}

export function advanceQuestion(current: GameSession, finishedAt?: string): GameSession {
  assertActive(current)
  if (current.phase !== 'feedback') throw new Error('No se puede avanzar antes de responder.')
  const nextIndex = current.currentQuestionIndex + 1
  if (nextIndex < current.questions.length) {
    return { ...current, currentQuestionIndex: nextIndex, phase: 'answering' }
  }
  const difficulty = current.configuration.difficulty === 'all'
    ? [...new Set(current.questions.map(({ exercise }) => exercise.difficulty))].length === 1
      ? current.questions[0].exercise.difficulty
      : 'mixed'
    : current.configuration.difficulty
  const durationKind = current.configuration.duration.kind === 'preset'
    ? current.configuration.duration.preset
    : 'custom'
  const result: GameResult = {
    sessionId: current.id,
    subjectId: current.subjectId,
    topicId: current.topicId,
    modeId: current.modeId,
    durationKind,
    questionCount: current.questions.length,
    difficulty,
    configurationKey: JSON.stringify(current.configuration),
    contentVersion: current.contentVersion,
    scoringVersion: SCORING_VERSION,
    score: current.score,
    correctCount: current.answers.filter(({ correct }) => correct).length,
    totalQuestions: current.questions.length,
    startedAt: current.startedAt,
    finishedAt: finishedAt ?? new Date().toISOString(),
  }
  return { ...current, status: 'completed', result }
}

export function abandonGame(current: GameSession): GameSession {
  assertActive(current)
  return { ...current, status: 'abandoned' }
}

export function restartGame(
  previous: GameSession,
  allExercises: readonly SingleChoiceExercise[],
  sessionId: string,
  random?: RandomSource,
  startedAt?: string,
): GameSession {
  if (previous.status === 'active') throw new Error('Abandona o completa la partida antes de reiniciarla.')
  return createGameSession({
    sessionId,
    subjectId: previous.subjectId,
    topicId: previous.topicId,
    contentVersion: previous.contentVersion,
    modeId: previous.modeId,
    configuration: previous.configuration,
    exercises: allExercises,
    random,
    startedAt,
  })
}

export function getRankingKey(result: GameResult): string {
  return JSON.stringify([
    result.subjectId,
    result.topicId,
    result.modeId,
    result.durationKind,
    result.questionCount,
    result.difficulty,
    result.configurationKey,
    result.contentVersion,
    result.scoringVersion,
  ])
}

function assertActive(current: GameSession): void {
  if (current.status !== 'active') throw new Error(`La partida está ${current.status}.`)
}

function copyExercise(exercise: SingleChoiceExercise): SingleChoiceExercise {
  return {
    ...exercise,
    learningObjectiveIds: [...exercise.learningObjectiveIds],
    tags: [...exercise.tags],
    options: exercise.options.map((option) => ({ ...option })),
    ...(exercise.hints ? { hints: [...exercise.hints] } : {}),
    ...(exercise.answerVariants ? { answerVariants: [...exercise.answerVariants] } : {}),
    ...(exercise.media ? { media: exercise.media.map((resource) => ({ ...resource })) } : {}),
  }
}
