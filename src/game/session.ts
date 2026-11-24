import { ref } from 'vue'
import type { Exercise } from '../types/content'
import { fisherYates, type RandomSource } from './random'

export interface SessionAnswer {
  exerciseId: string
  selectedOptionId: string
  correct: boolean
}

export interface SessionQuestion {
  exercise: Exercise
  optionIds: string[]
}

export interface GameSession {
  status: 'active' | 'abandoned' | 'completed'
  questions: SessionQuestion[]
  answers: SessionAnswer[]
  currentIndex: number
}

export const session = ref<GameSession | null>(null)

export function validateExercises(exercises: readonly Exercise[]): void {
  if (exercises.length === 0) throw new Error('Se necesita al menos un ejercicio.')
  const exerciseIds = new Set<string>()
  for (const exercise of exercises) {
    if (!exercise.id || exercise.type !== 'single_choice' || !exercise.prompt) {
      throw new Error('Ejercicio inválido.')
    }
    if (exerciseIds.has(exercise.id)) throw new Error(`Ejercicio duplicado: ${exercise.id}`)
    exerciseIds.add(exercise.id)
    if (exercise.options.length < 2) throw new Error(`Ejercicio sin opciones: ${exercise.id}`)
    const optionIds = new Set(exercise.options.map((option) => option.id))
    if (optionIds.size !== exercise.options.length) throw new Error(`Opciones duplicadas: ${exercise.id}`)
    if (!optionIds.has(exercise.correctOptionId)) throw new Error(`Respuesta correcta inválida: ${exercise.id}`)
  }
}

export function initializeSession(exercises: readonly Exercise[], random: RandomSource = Math.random): GameSession {
  validateExercises(exercises)
  const questionExercises = fisherYates(exercises, random)
  const questions = questionExercises.map((exercise) => ({
    exercise,
    optionIds: fisherYates(exercise.options.map((option) => option.id), random),
  }))
  const next: GameSession = { status: 'active', questions, answers: [], currentIndex: 0 }
  session.value = next
  return next
}

export function answerCurrent(optionId: string): SessionAnswer {
  const current = session.value
  if (!current || current.status !== 'active') throw new Error('No hay una partida activa.')
  if (current.answers.some((answer) => answer.exerciseId === current.questions[current.currentIndex]?.exercise.id)) {
    throw new Error('Esta pregunta ya fue respondida.')
  }
  const question = current.questions[current.currentIndex]
  if (!question || !question.optionIds.includes(optionId)) throw new Error('Opción inválida.')
  const answer: SessionAnswer = {
    exerciseId: question.exercise.id,
    selectedOptionId: optionId,
    correct: optionId === question.exercise.correctOptionId,
  }
  current.answers.push(answer)
  return answer
}

export function advanceSession(): void {
  const current = session.value
  if (!current || current.status !== 'active') throw new Error('No hay una partida activa.')
  if (current.answers.length > current.currentIndex) current.currentIndex += 1
  if (current.currentIndex >= current.questions.length) current.status = 'completed'
}

export function abandonSession(): void {
  if (!session.value) return
  session.value.status = 'abandoned'
}

export function resetSession(exercises: readonly Exercise[], random: RandomSource = Math.random): GameSession {
  session.value = null
  return initializeSession(exercises, random)
}

export function getScore(current: GameSession): { correct: number; total: number; percentage: number } {
  const correct = current.answers.filter((answer) => answer.correct).length
  const total = current.questions.length
  return { correct, total, percentage: total ? Math.round((correct / total) * 100) : 0 }
}
