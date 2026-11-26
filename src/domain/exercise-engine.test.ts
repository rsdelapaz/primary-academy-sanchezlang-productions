import { describe, expect, it } from 'vitest'
import type { TypedAnswerExercise } from './content'
import { evaluateGameAnswer, evaluateTypedAnswer } from './exercise-engine'

const exercise: TypedAnswerExercise = {
  id: 'typed-fixture',
  type: 'typed_answer',
  conceptId: 'technical-concept',
  learningObjectiveIds: ['technical-objective'],
  difficulty: 'beginner',
  tags: [],
  instructionLanguage: 'es',
  exerciseLanguage: 'en',
  explanationLanguage: 'es',
  prompt: 'Technical fixture only.',
  explanation: 'Technical fixture only.',
  acceptedAnswers: ['went', 'has gone'],
}

describe('evaluación de respuestas escritas', () => {
  it('normaliza NFC, espacios exteriores y mayúsculas sin alterar la respuesta original', () => {
    const evaluation = evaluateTypedAnswer(exercise, '  WENT  ')
    expect(evaluation).toMatchObject({
      type: 'typed_answer',
      submittedAnswer: '  WENT  ',
      correct: true,
    })
  })

  it('respeta caseSensitive cuando se activa y acepta variantes explícitas', () => {
    const sensitive: TypedAnswerExercise = {
      ...exercise,
      acceptedAnswers: ['café', 'Go!'],
      caseSensitive: true,
    }
    expect(evaluateTypedAnswer(sensitive, 'cafe\u0301').correct).toBe(true)
    expect(evaluateTypedAnswer(sensitive, 'cafe').correct).toBe(false)
    expect(evaluateTypedAnswer(sensitive, 'go!').correct).toBe(false)
    expect(evaluateTypedAnswer(exercise, 'went!').correct).toBe(false)
  })

  it('rechaza respuestas vacías y respuestas de otro tipo', () => {
    expect(() => evaluateTypedAnswer(exercise, '   ')).toThrow(/no puede estar vacía/)
    expect(() => evaluateGameAnswer(exercise, { type: 'single_choice', optionId: 'option-a' }))
      .toThrow(/no coincide con el tipo/)
  })

  it('rechaza variantes vacías o duplicadas tras normalización', () => {
    expect(() => evaluateTypedAnswer({ ...exercise, acceptedAnswers: ['  '] }, 'went'))
      .toThrow(/Respuesta aceptada vacía/)
    expect(() => evaluateTypedAnswer({ ...exercise, acceptedAnswers: ['café', 'cafe\u0301'] }, 'café'))
      .toThrow(/duplicadas tras normalización/)
  })
})
