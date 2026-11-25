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
  return answerQuestion(game, question.exercise.id, question.exercise.correctOptionId)
}

describe('Misión del Tesoro', () => {
  it('awards one key for each correct answer and neither keys nor points for errors', () => {
    let game = createTreasureGame()
    const first = getCurrentQuestion(game)!
    const wrongId = first.optionIds.find((id) => id !== first.exercise.correctOptionId)!
    game = answerQuestion(game, first.exercise.id, wrongId)
    expect(treasureState(game).keysAvailable).toBe(0)
    expect(game.score).toBe(0)

    game = advanceQuestion(game)
    game = answerCorrectly(game)
    expect(treasureState(game).keysAvailable).toBe(1)
    expect(game.score).toBe(100)
  })

  it('calculates the three chest prices from the configured question count', () => {
    expect([5, 7, 10].map((count) => [
      getTreasureCost('star-crystal', count),
      getTreasureCost('golden-compass', count),
      getTreasureCost('moon-crown', count),
    ])).toEqual([[1, 2, 3], [2, 3, 5], [2, 4, 6]])
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
    expect(treasureState(opened).keysAvailable).toBe(2)

    const restarted = restartGame(opened, exercises, 'treasure-restarted', () => 0)
    expect(restarted.modeId).toBe('treasure')
    expect(restarted.configuration).toEqual(game.configuration)
    expect(treasureState(restarted)).toEqual({ modeId: 'treasure', keysAvailable: 0, openedTreasures: [] })
  })

  it('registers treasure compatibility with single-choice exercises', () => {
    expect(isGameModeCompatible('treasure', 'single_choice')).toBe(true)
    expect(isGameModeCompatible('classic', 'single_choice')).toBe(true)
    expect(isGameModeCompatible('treasure', 'matching')).toBe(false)
  })
})
