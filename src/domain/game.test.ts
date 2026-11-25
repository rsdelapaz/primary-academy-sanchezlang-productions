import { describe, expect, it } from 'vitest'
import type { GameExercise, SingleChoiceExercise, TypedAnswerExercise } from './content'
import {
  abandonGame,
  advanceQuestion,
  answerQuestion,
  createGameSession,
  getGameStats,
  getCurrentQuestion,
  getEligibleExercises,
  getMixedExerciseDistribution,
  getRankingKey,
  getPresetCount,
  restartGame,
  type GameConfiguration,
  type GameModeId,
  type SessionQuestion,
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

const typedExercises: TypedAnswerExercise[] = Array.from({ length: 8 }, (_, index) => ({
  id: `typed-exercise-${index + 1}`,
  type: 'typed_answer',
  conceptId: 'math-technical-concept',
  learningObjectiveIds: ['math-technical-objective'],
  difficulty: index < 4 ? 'beginner' : 'intermediate',
  tags: [],
  instructionLanguage: 'es',
  exerciseLanguage: 'es',
  explanationLanguage: 'es',
  prompt: `Fixture técnico ${index + 1}: escribe el resultado.`,
  explanation: 'Fixture técnico de matemáticas.',
  acceptedAnswers: [`resultado-${index + 1}`],
}))

const mixedExercises: GameExercise[] = [...exercises.slice(0, 8), ...typedExercises]

const shortConfig: GameConfiguration = {
  duration: { kind: 'preset', preset: 'short', questionCount: 5 },
  difficulty: 'all',
  answerFormat: 'selection',
}

function choiceQuestion(question: SessionQuestion): Extract<SessionQuestion, { type: 'single_choice' }> {
  if (question.type !== 'single_choice') throw new Error('Expected a single-choice question.')
  return question
}

function correctAnswer(question: SessionQuestion) {
  return question.type === 'single_choice'
    ? { type: 'single_choice' as const, optionId: question.exercise.correctOptionId }
    : { type: 'typed_answer' as const, text: question.exercise.acceptedAnswers[0] }
}

function create(random = () => 0, modeId: GameModeId = 'classic') {
  return createGameSession({
    sessionId: 'session-one',
    subjectId: 'mathematics',
    topicId: 'addition',
    contentVersion: '1.2.0',
    modeId,
    configuration: shortConfig,
    exercises,
    random,
    startedAt: '2026-01-01T00:00:00.000Z',
  })
}

function createMixed(
  questionCount: number,
  modeId: GameModeId = 'classic',
  random = () => 0,
) {
  return createGameSession({
    sessionId: `mixed-${questionCount}`,
    subjectId: 'mathematics',
    topicId: 'technical-fixtures',
    contentVersion: '1.0.0',
    modeId,
    configuration: {
      duration: { kind: 'custom', questionCount },
      difficulty: 'all',
      answerFormat: 'mixed',
    },
    exercises: mixedExercises,
    random,
  })
}

function typedQuestion(question: ReturnType<typeof getCurrentQuestion>) {
  if (!question || question.type !== 'typed_answer') throw new Error('Expected a typed-answer question.')
  return question
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
    const firstQuestion = choiceQuestion(game.questions[0])
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
    expect(getEligibleExercises(exercises, 'beginner')).toHaveLength(10)
    expect(JSON.stringify(exercises)).toBe(snapshot)
    firstQuestion.exercise.options[0].text = 'Mutated in session'
    expect(exercises.find(({ id }) => id === firstQuestion.exercise.id)?.options[0].text)
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

  it('distribuye formatos mixtos cerca del 50 % y redistribuye los tipos escasos', () => {
    expect(getMixedExerciseDistribution(mixedExercises, 5)).toEqual({ singleChoice: 3, typedAnswer: 2 })
    expect(getMixedExerciseDistribution([...exercises.slice(0, 1), ...typedExercises], 5))
      .toEqual({ singleChoice: 1, typedAnswer: 4 })
    expect(getMixedExerciseDistribution(typedExercises, 5)).toEqual({ singleChoice: 0, typedAnswer: 5 })
  })

  it('filtra los formatos y mezcla ejercicios sin reemplazo ni agrupación fija', () => {
    const configuration = (answerFormat: 'selection' | 'written') => ({
      duration: { kind: 'custom' as const, questionCount: 3 },
      difficulty: 'all' as const,
      answerFormat,
    })
    const selected = createGameSession({
      sessionId: 'selection-only',
      subjectId: 'mathematics',
      topicId: 'technical-fixtures',
      contentVersion: '1.0.0',
      modeId: 'classic',
      configuration: configuration('selection'),
      exercises: mixedExercises,
      random: () => 0,
    })
    const written = createGameSession({
      sessionId: 'written-only',
      subjectId: 'mathematics',
      topicId: 'technical-fixtures',
      contentVersion: '1.0.0',
      modeId: 'classic',
      configuration: configuration('written'),
      exercises: mixedExercises,
      random: () => 0,
    })
    expect(selected.questions.every(({ type }) => type === 'single_choice')).toBe(true)
    expect(written.questions.every(({ type }) => type === 'typed_answer')).toBe(true)

    const seeded = (initial: number) => () => {
      initial = (initial * 9301 + 49297) % 233280
      return initial / 233280
    }
    const first = createMixed(5, 'classic', seeded(42))
    const second = createMixed(5, 'classic', seeded(42))
    const types = first.questions.map(({ type }) => type)
    const snapshot = JSON.stringify(mixedExercises)
    expect(types).toEqual(second.questions.map(({ type }) => type))
    expect(types.filter((type) => type === 'single_choice')).toHaveLength(3)
    expect(types.filter((type) => type === 'typed_answer')).toHaveLength(2)
    expect(new Set(first.questions.map(({ exercise }) => exercise.id)).size).toBe(5)
    expect(types.some((type, index) => index > 0 && type !== types[index - 1])).toBe(true)
    const typed = first.questions.find((question) => question.type === 'typed_answer')
    if (!typed || typed.type !== 'typed_answer') throw new Error('Expected a typed exercise in the mixed session.')
    typed.exercise.acceptedAnswers[0] = 'session mutation'
    expect(JSON.stringify(mixedExercises)).toBe(snapshot)
  })

  it('evalúa respuestas escritas por variante, conserva el texto original y reinicia el formato mixto', () => {
    const written = createGameSession({
      sessionId: 'written-original',
      subjectId: 'mathematics',
      topicId: 'technical-fixtures',
      contentVersion: '1.0.0',
      modeId: 'classic',
      configuration: {
        duration: { kind: 'custom', questionCount: 1 },
        difficulty: 'all',
        answerFormat: 'written',
      },
      exercises: typedExercises,
      random: () => 0,
    })
    const current = typedQuestion(getCurrentQuestion(written))
    const original = `  ${current.exercise.acceptedAnswers[0].toUpperCase()} `
    const answered = answerQuestion(written, current.exercise.id, { type: 'typed_answer', text: original })
    expect(answered.answers[0]).toMatchObject({
      type: 'typed_answer',
      submittedAnswer: original,
      correct: true,
      points: 100,
    })
    expect(written.questions[0].type).toBe('typed_answer')
    const mixed = createMixed(5, 'treasure')
    const restarted = restartGame(abandonGame(mixed), mixedExercises, 'mixed-restarted', () => 0)
    expect(restarted.configuration.answerFormat).toBe('mixed')
    expect(restarted.questions.filter(({ type }) => type === 'single_choice')).toHaveLength(3)
    expect(restarted.questions.filter(({ type }) => type === 'typed_answer')).toHaveLength(2)
  })

  it('recompensa respuestas correctas de ambos tipos sin cambiar las reglas de puntuación', () => {
    let game = createMixed(2, 'treasure')
    for (let index = 0; index < 2; index += 1) {
      const current = getCurrentQuestion(game)!
      game = answerQuestion(game, current.exercise.id, correctAnswer(current))
      if (index === 0) game = advanceQuestion(game)
    }
    expect(game.score).toBe(200)
    expect(game.modeState).toMatchObject({ modeId: 'treasure', keysAvailable: 2 })
    expect(game.answers.every(({ correct, points }) => correct && points === 100)).toBe(true)
  })

  it.each(['classic', 'treasure'] as const)('%s mezcla cuatro opciones reproduciblemente y conserva el orden por pregunta', (modeId) => {
    const seeded = (initial: number) => () => {
      initial = (initial * 9301 + 49297) % 233280
      return initial / 233280
    }
    const first = create(seeded(42), modeId)
    const second = create(seeded(42), modeId)
    expect(first.questions.map((question) => choiceQuestion(question).optionIds))
      .toEqual(second.questions.map((question) => choiceQuestion(question).optionIds))
    for (const question of first.questions) {
      const current = choiceQuestion(question)
      expect(current.optionIds).toHaveLength(4)
      expect(new Set(current.optionIds).size).toBe(4)
    }
  })

  it.each(['classic', 'treasure'] as const)('%s distribuye la respuesta correcta entre las cuatro posiciones', (modeId) => {
    const positions = new Set<number>()
    const counts = [0, 0, 0, 0]
    for (let seed = 1; seed <= 400; seed += 1) {
      const session = createGameSession({
        sessionId: `distribution-${seed}`,
        subjectId: 'mathematics',
        topicId: 'addition',
        contentVersion: '1.2.0',
        modeId,
        configuration: { duration: { kind: 'preset', preset: 'long', questionCount: 20 }, difficulty: 'all' },
        exercises,
        random: () => ((seed * 73) % 401) / 401,
      })
      const q = session.questions.find(({ exercise }) => exercise.id === 'exercise-1')!
      const current = choiceQuestion(q)
      const position = current.optionIds.indexOf(current.exercise.correctOptionId)
      positions.add(position)
      counts[position] += 1
    }
    expect(positions.size).toBe(4)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThan(80)
  })

  it('evalúa por identificador aunque cambie la posición visual', () => {
    const session = create()
    const question = choiceQuestion(getCurrentQuestion(session)!)
    const correctId = question.exercise.correctOptionId
    const optionOrder = [...question.optionIds]
    const answered = answerQuestion(session, question.exercise.id, { type: 'single_choice', optionId: correctId })
    expect(choiceQuestion(getCurrentQuestion(answered)!).optionIds).toEqual(optionOrder)
    expect(answered.answers[0]).toMatchObject({
      type: 'single_choice', exerciseId: question.exercise.id, selectedOptionId: correctId, correct: true, points: 100,
    })
    expect(session.answers).toHaveLength(0)
    expect(answerQuestion(session, question.exercise.id, { type: 'single_choice', optionId: question.optionIds[0] }).answers[0].correct)
      .toBe(question.optionIds[0] === correctId)
  })

  it('protege respuesta duplicada y avance antes de responder', () => {
    const session = create()
    expect(() => advanceQuestion(session)).toThrow(/antes de responder/)
    const current = getCurrentQuestion(session)!
    const response = correctAnswer(current)
    const answered = answerQuestion(session, current.exercise.id, response)
    expect(() => answerQuestion(answered, current.exercise.id, response)).toThrow(/ya fue respondida/)
    expect(() => answerQuestion(session, 'another-exercise', response)).toThrow(/no corresponde/)
    expect(() => answerQuestion(session, current.exercise.id, { type: 'single_choice', optionId: 'missing-option' }))
      .toThrow(/Opción inexistente/)
  })

  it('avanza, finaliza y produce un resultado clasificable con puntos', () => {
    let session = create()
    for (let index = 0; index < 5; index += 1) {
      const current = getCurrentQuestion(session)!
      const choice = choiceQuestion(current)
      const selected = index === 0
        ? choice.optionIds.find((id) => id !== choice.exercise.correctOptionId)!
        : choice.exercise.correctOptionId
      session = answerQuestion(session, current.exercise.id, { type: 'single_choice', optionId: selected })
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

  it('deriva puntuación, progreso y rachas de las respuestas sin multiplicadores', () => {
    let session = create()
    for (let index = 0; index < 3; index += 1) {
      const current = getCurrentQuestion(session)!
      const choice = choiceQuestion(current)
      const selected = index === 2
        ? choice.optionIds.find((id) => id !== choice.exercise.correctOptionId)!
        : choice.exercise.correctOptionId
      session = answerQuestion(session, current.exercise.id, { type: 'single_choice', optionId: selected })
      if (index < 2) session = advanceQuestion(session)
    }
    expect(getGameStats(session)).toMatchObject({
      score: 200,
      correctCount: 2,
      answeredCount: 3,
      totalQuestions: 5,
      currentStreak: 0,
      bestStreak: 2,
      progressPercent: 60,
    })
  })

  it('abandona sin permitir modificar y reinicia conservando la configuración', () => {
    const abandoned = abandonGame(create())
    expect(abandoned.status).toBe('abandoned')
    expect(() => abandonGame(abandoned)).toThrow(/abandoned/)
    expect(() => answerQuestion(abandoned, 'exercise-1', { type: 'single_choice', optionId: 'option-1-c' }))
      .toThrow(/abandoned/)
    const restarted = restartGame(abandoned, exercises, 'session-two', () => 0.8, '2026-01-02T00:00:00.000Z')
    expect(restarted.id).toBe('session-two')
    expect(restarted.configuration).toEqual(shortConfig)
    expect(restarted.status).toBe('active')
    expect(restarted.answers).toEqual([])
  })

  it.each(['classic', 'treasure'] as const)('%s vuelve a generar las mezclas al reiniciar', (modeId) => {
    let randomCalls = 0
    const random = () => {
      randomCalls += 1
      return 0.4
    }
    const session = create(random, modeId)
    const callsAtStart = randomCalls
    const restarted = restartGame(abandonGame(session), exercises, 'reshuffled-session', random)

    expect(randomCalls).toBeGreaterThan(callsAtStart)
    expect(restarted.modeId).toBe(modeId)
    expect(restarted.questions.every((question) => new Set(choiceQuestion(question).optionIds).size === 4)).toBe(true)
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
