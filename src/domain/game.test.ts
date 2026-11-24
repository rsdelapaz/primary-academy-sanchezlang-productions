import { describe, expect, it } from 'vitest'
import type { SingleChoiceExercise } from './content'
import {
  abandonGame,
  advanceQuestion,
  answerQuestion,
  createGameSession,
  getCurrentQuestion,
  getEligibleExercises,
  getRankingKey,
  getPresetCount,
  restartGame,
  type GameConfiguration,
} from './game'

const exercises: SingleChoiceExercise[] = Array.from({ length: 20 }, (_, index) => {
  const number = index + 1
  return {
    id: `exercise-${number}`,
    type: 'single_choice',
    conceptId: 'concept-one',
    learningObjectiveIds: ['objective-one'],
    difficulty: number <= 10 ? 'beginner' : 'intermediate',
    tags: [],
    instructionLanguage: 'es',
    exerciseLanguage: 'es',
    explanationLanguage: 'es',
    prompt: `Pregunta ${number}`,
    explanation: 'Explicación de prueba.',
    options: [
      { id: `option-${number}-a`, text: 'A' },
      { id: `option-${number}-b`, text: 'B' },
      { id: `option-${number}-c`, text: 'C' },
      { id: `option-${number}-d`, text: 'D' },
    ],
    correctOptionId: `option-${number}-c`,
  }
})

const shortConfig: GameConfiguration = {
  duration: { kind: 'preset', preset: 'short', questionCount: 5 },
  difficulty: 'all',
}

function create(random = () => 0) {
  return createGameSession({
    sessionId: 'session-one',
    subjectId: 'mathematics',
    topicId: 'addition',
    contentVersion: '1.2.0',
    modeId: 'classic',
    configuration: shortConfig,
    exercises,
    random,
    startedAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('motor de juego independiente', () => {
  it('define las duraciones sin exceder el banco', () => {
    expect([getPresetCount('short'), getPresetCount('medium'), getPresetCount('long')]).toEqual([5, 10, 20])
    expect(() => createGameSession({
      sessionId: 'invalid', subjectId: 'mathematics', topicId: 'addition', contentVersion: '1.0.0',
      modeId: 'classic', configuration: { duration: { kind: 'preset', preset: 'long', questionCount: 20 }, difficulty: 'beginner' },
      exercises: exercises.slice(0, 10),
    })).toThrow(/compatibles disponibles/)
    expect(() => createGameSession({
      sessionId: 'invalid', subjectId: 'mathematics', topicId: 'addition', contentVersion: '1.0.0',
      modeId: 'classic', configuration: { duration: { kind: 'custom', questionCount: 0 }, difficulty: 'all' }, exercises,
    })).toThrow(/entero positivo/)
  })

  it('filtra por dificultad y selecciona sin reemplazo sin mutar el banco', () => {
    const snapshot = JSON.stringify(exercises)
    const game = create()
    const ids = game.questions.map(({ exercise }) => exercise.id)
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
    expect(getEligibleExercises(exercises, 'beginner')).toHaveLength(10)
    expect(JSON.stringify(exercises)).toBe(snapshot)
    game.questions[0].exercise.options[0].text = 'Mutated in session'
    expect(exercises.find(({ id }) => id === game.questions[0].exercise.id)?.options[0].text)
      .not.toBe('Mutated in session')
  })

  it('admite una partida personalizada dentro del subconjunto compatible', () => {
    const game = createGameSession({
      sessionId: 'custom-session',
      subjectId: 'mathematics',
      topicId: 'addition',
      contentVersion: '1.2.0',
      modeId: 'classic',
      configuration: { duration: { kind: 'custom', questionCount: 3 }, difficulty: 'beginner' },
      exercises,
      random: () => 0,
    })
    expect(game.questions).toHaveLength(3)
    expect(game.questions.every(({ exercise }) => exercise.difficulty === 'beginner')).toBe(true)
  })

  it('mezcla cuatro opciones reproduciblemente y conserva el orden por pregunta', () => {
    const seeded = (initial: number) => () => {
      initial = (initial * 9301 + 49297) % 233280
      return initial / 233280
    }
    const first = create(seeded(42))
    const second = create(seeded(42))
    expect(first.questions.map(({ optionIds }) => optionIds)).toEqual(second.questions.map(({ optionIds }) => optionIds))
    for (const question of first.questions) {
      expect(question.optionIds).toHaveLength(4)
      expect(new Set(question.optionIds).size).toBe(4)
    }
  })

  it('distribuye la respuesta correcta entre las cuatro posiciones', () => {
    const positions = new Set<number>()
    const counts = [0, 0, 0, 0]
    for (let seed = 1; seed <= 400; seed += 1) {
      const session = createGameSession({
        sessionId: `distribution-${seed}`,
        subjectId: 'mathematics',
        topicId: 'addition',
        contentVersion: '1.2.0',
        modeId: 'classic',
        configuration: { duration: { kind: 'preset', preset: 'long', questionCount: 20 }, difficulty: 'all' },
        exercises,
        random: () => ((seed * 73) % 401) / 401,
      })
      const q = session.questions.find(({ exercise }) => exercise.id === 'exercise-1')!
      const position = q.optionIds.indexOf(q.exercise.correctOptionId)
      positions.add(position)
      counts[position] += 1
    }
    expect(positions.size).toBe(4)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThan(80)
  })

  it('evalúa por identificador aunque cambie la posición visual', () => {
    const session = create()
    const question = getCurrentQuestion(session)!
    const correctId = question.exercise.correctOptionId
    const answered = answerQuestion(session, question.exercise.id, correctId)
    expect(answered.answers[0]).toMatchObject({ exerciseId: question.exercise.id, selectedOptionId: correctId, correct: true, points: 100 })
    expect(session.answers).toHaveLength(0)
    expect(answerQuestion(session, question.exercise.id, question.optionIds[0]).answers[0].correct)
      .toBe(question.optionIds[0] === correctId)
  })

  it('protege respuesta duplicada y avance antes de responder', () => {
    const session = create()
    expect(() => advanceQuestion(session)).toThrow(/antes de responder/)
    const current = getCurrentQuestion(session)!
    const answered = answerQuestion(session, current.exercise.id, current.exercise.correctOptionId)
    expect(() => answerQuestion(answered, current.exercise.id, current.exercise.correctOptionId)).toThrow(/ya fue respondida/)
    expect(() => answerQuestion(session, 'another-exercise', current.exercise.correctOptionId)).toThrow(/no corresponde/)
    expect(() => answerQuestion(session, current.exercise.id, 'missing-option')).toThrow(/Opción inexistente/)
  })

  it('avanza, finaliza y produce un resultado clasificable con puntos', () => {
    let session = create()
    for (let index = 0; index < 5; index += 1) {
      const current = getCurrentQuestion(session)!
      const selected = index === 0
        ? current.optionIds.find((id) => id !== current.exercise.correctOptionId)!
        : current.exercise.correctOptionId
      session = answerQuestion(session, current.exercise.id, selected)
      session = advanceQuestion(session, '2026-01-01T00:02:00.000Z')
    }
    expect(session.status).toBe('completed')
    expect(session.score).toBe(400)
    expect(session.result).toMatchObject({
      score: 400, correctCount: 4, totalQuestions: 5, difficulty: 'beginner',
      durationKind: 'short', contentVersion: '1.2.0', scoringVersion: '1',
    })
    expect(getRankingKey(session.result!)).toContain('"addition"')
    expect(getRankingKey({ ...session.result!, contentVersion: '1.2.1' })).not.toBe(getRankingKey(session.result!))
    expect(() => advanceQuestion(session)).toThrow(/completed/)
  })

  it('abandona sin permitir modificar y reinicia conservando la configuración', () => {
    const abandoned = abandonGame(create())
    expect(abandoned.status).toBe('abandoned')
    expect(() => abandonGame(abandoned)).toThrow(/abandoned/)
    expect(() => answerQuestion(abandoned, 'exercise-1', 'option-1-c')).toThrow(/abandoned/)
    const restarted = restartGame(abandoned, exercises, 'session-two', () => 0.8, '2026-01-02T00:00:00.000Z')
    expect(restarted.id).toBe('session-two')
    expect(restarted.configuration).toEqual(shortConfig)
    expect(restarted.status).toBe('active')
    expect(restarted.answers).toEqual([])
  })

  it('rechaza identificadores incompletos de sesión y contenido', () => {
    expect(() => createGameSession({
      sessionId: ' ', subjectId: 'mathematics', topicId: 'addition', contentVersion: '1.0.0',
      modeId: 'classic', configuration: shortConfig, exercises,
    })).toThrow(/requiere IDs/)
  })

  it('rechaza modalidad no operativa y ejercicios duplicados', () => {
    expect(() => createGameSession({
      sessionId: 'invalid', subjectId: 'english', topicId: 'verbs', contentVersion: '1.0.0',
      modeId: 'flashcard', configuration: shortConfig, exercises,
    })).toThrow(/no operativa/)
    expect(() => createGameSession({
      sessionId: 'invalid', subjectId: 'english', topicId: 'verbs', contentVersion: '1.0.0',
      modeId: 'classic', configuration: shortConfig, exercises: [...exercises, exercises[0]],
    })).toThrow(/duplicados/)
  })
})
