import { describe, expect, it } from 'vitest'
import type { Exercise } from '../types/content'
import {
  abandonSession,
  answerCurrent,
  advanceSession,
  getScore,
  initializeSession,
  resetSession,
  session,
  validateExercises,
} from './session'

const exerciseSet: Exercise[] = [
  { id: 'q1', type: 'single_choice', prompt: 'Uno', context: 'Contexto', options: [{ id: 'q1-a', label: 'A' }, { id: 'q1-b', label: 'B' }], correctOptionId: 'q1-b', explanation: 'B' },
  { id: 'q2', type: 'single_choice', prompt: 'Dos', context: 'Contexto', options: [{ id: 'q2-a', label: 'A' }, { id: 'q2-b', label: 'B' }], correctOptionId: 'q2-a', explanation: 'A' },
]

describe('sesión de juego', () => {
  it('inicializa, corrige por identificador y mantiene opciones estables', () => {
    initializeSession(exerciseSet, () => 0)
    expect(session.value?.status).toBe('active')
    const first = session.value!.questions[0]
    expect(first.optionIds).toHaveLength(2)
    expect(new Set(first.optionIds).size).toBe(2)
    const answer = answerCurrent(first.exercise.correctOptionId)
    expect(answer.correct).toBe(true)
  })

  it('completa y reinicia una partida', () => {
    initializeSession(exerciseSet, () => 0)
    for (const question of session.value!.questions) {
      answerCurrent(question.exercise.correctOptionId)
      advanceSession()
    }
    expect(session.value?.status).toBe('completed')
    expect(getScore(session.value!).percentage).toBe(100)
    resetSession(exerciseSet, () => 0)
    expect(session.value?.answers).toEqual([])
    expect(session.value?.currentIndex).toBe(0)
  })

  it('permite abandonar', () => {
    initializeSession(exerciseSet)
    abandonSession()
    expect(session.value?.status).toBe('abandoned')
  })

  it('calcula la puntuación por precisión', () => {
    initializeSession(exerciseSet, () => 0)
    const first = session.value!.questions[0]
    answerCurrent(first.exercise.correctOptionId)
    advanceSession()
    const second = session.value!.questions[1]
    const wrong = second.optionIds.find((id) => id !== second.exercise.correctOptionId)!
    answerCurrent(wrong)
    advanceSession()
    expect(getScore(session.value!)).toEqual({ correct: 1, total: 2, percentage: 50 })
  })

  it('rechaza datos inválidos y duplicados', () => {
    expect(() => validateExercises([])).toThrow()
    expect(() => validateExercises([exerciseSet[0], exerciseSet[0]])).toThrow(/duplicado/)
    const invalid = [{ ...exerciseSet[0], correctOptionId: 'missing' }]
    expect(() => validateExercises(invalid)).toThrow(/respuesta correcta/i)
  })

  it('mezcla preguntas sin duplicarlas ni mutar originales', () => {
    const snapshot = JSON.stringify(exerciseSet)
    initializeSession(exerciseSet, () => 0.5)
    const ids = session.value!.questions.map((question) => question.exercise.id)
    expect(ids).toHaveLength(exerciseSet.length)
    expect(new Set(ids).size).toBe(exerciseSet.length)
    expect(JSON.stringify(exerciseSet)).toBe(snapshot)
  })

  it('distribuye posiciones de respuestas sin sesgo excesivo', () => {
    const positions = new Map<string, number>()
    for (let seed = 1; seed <= 200; seed += 1) {
      initializeSession(exerciseSet, () => ((seed * 17) % 101) / 101)
      const question = session.value!.questions.find((item) => item.exercise.id === 'q1')!
      const position = question.optionIds.indexOf(question.exercise.correctOptionId)
      positions.set(String(position), (positions.get(String(position)) ?? 0) + 1)
    }
    expect(positions.size).toBe(2)
    expect(Math.abs((positions.get('0') ?? 0) - (positions.get('1') ?? 0))).toBeLessThan(80)
  })

  it('rechaza respuestas repetidas y opciones desconocidas', () => {
    initializeSession(exerciseSet)
    const first = session.value!.questions[0]
    answerCurrent(first.exercise.correctOptionId)
    expect(() => answerCurrent(first.exercise.correctOptionId)).toThrow(/ya fue/)
    expect(() => answerCurrent('missing')).toThrow()
  })
})
