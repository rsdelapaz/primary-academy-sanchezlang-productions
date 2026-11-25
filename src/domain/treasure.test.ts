import { describe, expect, it } from 'vitest'
import type { SingleChoiceExercise } from './content'
import { advanceQuestion, answerQuestion, createGameSession, getCurrentQuestion, restartGame } from './game'
import { isGameModeCompatible } from './game-modes'
import { getTreasureCost, openTreasure } from './treasure'

const exercises: SingleChoiceExercise[] = Array.from({ length: 20 }, (_, index) => ({
  id: `exercise-${index + 1}`,
  type: 'single_choice',
  conceptId: 'concept',
  learningObjectiveIds: [],
  difficulty: 'beginner',
  tags: [],
  instructionLanguage: 'es',
  exerciseLanguage: 'es',
  explanationLanguage: 'es',
  prompt: `Pregunta ${index + 1}`,
  explanation: 'Explicación.',
  options: [
    { id: `option-${index}-a`, text: 'Correcta' },
    { id: `option-${index}-b`, text: 'Incorrecta' },
  ],
  correctOptionId: `option-${index}-a`,
}))

function createTreasureGame(questionCount = 5) {
  return createGameSession({
    sessionId: `treasure-${questionCount}`,
    subjectId: 'english',
    topicId: 'irregular-verbs',
    contentVersion: '1.0.0',
    modeId: 'treasure',
    configuration: { duration: { kind: 'custom', questionCount }, difficulty: 'all' },
    exercises,
    random: () => 0,
  })
}

function treasureState(game: ReturnType<typeof createTreasureGame>) {
  if (game.modeState.modeId !== 'treasure') throw new Error('Expected treasure mode state.')
  return game.modeState
}

function answerCorrectly(game: ReturnType<typeof createTreasureGame>) {
  const question = getCurrentQuestion(game)
  if (!question) throw new Error('Expected a current question.')
  const response = question.type === 'single_choice'
    ? { type: 'single_choice' as const, optionId: question.exercise.correctOptionId }
    : { type: 'typed_answer' as const, text: question.exercise.acceptedAnswers[0] }
  return answerQuestion(game, question.exercise.id, response)
}

describe('Misión del Tesoro', () => {
  it('awards one key for each correct answer and neither keys nor points for errors', () => {
    let game = createTreasureGame()
    const first = getCurrentQuestion(game)!
    if (first.type !== 'single_choice') throw new Error('Expected a single-choice question.')
    const wrongId = first.optionIds.find((id) => id !== first.exercise.correctOptionId)!
    game = answerQuestion(game, first.exercise.id, { type: 'single_choice', optionId: wrongId })
    expect(treasureState(game).keysAvailable).toBe(0)
    expect(game.score).toBe(0)

    game = advanceQuestion(game)
    game = answerCorrectly(game)
    expect(treasureState(game).keysAvailable).toBe(1)
    expect(game.score).toBe(100)
  })

  it('prices every chest so a perfect game can open all rewards', () => {
    expect([5, 7, 10, 20].map((count) => [
      getTreasureCost('star-crystal', count),
      getTreasureCost('golden-compass', count),
      getTreasureCost('moon-crown', count),
    ])).toEqual([[1, 2, 2], [2, 3, 2], [2, 3, 5], [4, 6, 10]])
    expect([3, 5, 10, 20].map((count) => [
      getTreasureCost('star-crystal', count),
      getTreasureCost('golden-compass', count),
      getTreasureCost('moon-crown', count),
    ].reduce((total, cost) => total + cost, 0))).toEqual([3, 5, 10, 20])
  })

  it('offers one-key chests for short sessions and rejects unavailable ones', () => {
    expect(getTreasureCost('star-crystal', 1)).toBe(1)
    expect(getTreasureCost('star-crystal', 2)).toBe(1)
    expect(getTreasureCost('golden-compass', 2)).toBe(1)
    expect(() => getTreasureCost('moon-crown', 2)).toThrow(/no está disponible/)
  })

  it('allows opening only during feedback, rejects insufficient keys and prevents duplicates', () => {
    let game = createTreasureGame(10)
    expect(() => openTreasure(game, 'star-crystal')).toThrow(/después de responder/)

    game = answerCorrectly(game)
    expect(() => openTreasure(game, 'star-crystal')).toThrow(/llaves suficientes/)
    game = advanceQuestion(game)
    game = answerCorrectly(game)
    const opened = openTreasure(game, 'star-crystal')

    expect(treasureState(opened)).toMatchObject({ keysAvailable: 0, openedTreasures: ['star-crystal'] })
    expect(treasureState(game).keysAvailable).toBe(2)
    expect(() => openTreasure(opened, 'star-crystal')).toThrow(/ya fue abierto/)
  })

  it('permits post-game opening without changing the result and resets treasure state on restart', () => {
    let game = createTreasureGame()
    for (let index = 0; index < 5; index += 1) {
      game = answerCorrectly(game)
      game = advanceQuestion(game)
    }
    expect(game.status).toBe('completed')
    const result = game.result
    const opened = openTreasure(game, 'moon-crown')
    expect(opened.result).toEqual(result)
    expect(opened.score).toBe(500)
    expect(treasureState(opened).keysAvailable).toBe(3)

    const restarted = restartGame(opened, exercises, 'treasure-restarted', () => 0)
    expect(restarted.modeId).toBe('treasure')
    expect(restarted.configuration).toEqual(game.configuration)
    expect(treasureState(restarted)).toEqual({ modeId: 'treasure', keysAvailable: 0, openedTreasures: [] })
  })

  it('registers both game modes for the two operational answer types', () => {
    expect(isGameModeCompatible('treasure', 'single_choice')).toBe(true)
    expect(isGameModeCompatible('classic', 'single_choice')).toBe(true)
    expect(isGameModeCompatible('treasure', 'typed_answer')).toBe(true)
    expect(isGameModeCompatible('classic', 'typed_answer')).toBe(true)
    expect(isGameModeCompatible('treasure', 'matching')).toBe(false)
  })
})
