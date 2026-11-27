import { describe, expect, it } from 'vitest'
import type { ContentPackage, SingleChoiceExercise } from '../domain/content'
import { getRankingKey, type GameConfiguration } from '../domain/game'
import {
  abandonActiveGame,
  advanceActiveQuestion,
  answerActiveQuestion,
  gameAutoAdvanceEnabled,
  restartActiveGame,
  startGame,
} from './game-session'

const exercise: SingleChoiceExercise = {
  id: 'exercise-one',
  type: 'single_choice',
  conceptId: 'multiplication',
  learningObjectiveIds: ['calculate'],
  difficulty: 'beginner',
  tags: ['multiplication'],
  instructionLanguage: 'es',
  exerciseLanguage: 'es',
  explanationLanguage: 'es',
  prompt: '2 × 3',
  explanation: '2 × 3 = 6',
  options: [
    { id: 'six', text: '6' },
    { id: 'five', text: '5' },
  ],
  correctOptionId: 'six',
}

const content: ContentPackage = {
  schemaVersion: '1.0.0',
  contentVersion: '1.0.0',
  subjectId: 'mathematics',
  topicId: 'multiplication',
  concepts: [{ id: 'multiplication', label: 'Multiplicar' }],
  learningObjectives: [{ id: 'calculate', label: 'Calcular' }],
  exercises: [exercise],
}

const configuration: GameConfiguration = {
  duration: { kind: 'custom', questionCount: 1 },
  difficulty: 'beginner',
  answerFormat: 'selection',
}

function start(autoAdvance?: boolean) {
  return startGame('mathematics', 'multiplication', content, 'classic', configuration,
    autoAdvance === undefined ? undefined : { autoAdvance })
}

function finish() {
  answerActiveQuestion(exercise.id, { type: 'single_choice', optionId: 'six' })
  const result = advanceActiveQuestion().result
  if (!result) throw new Error('Expected completed game')
  return result
}

describe('game playback preference', () => {
  it('starts new games in manual mode unless automatic advance is selected', () => {
    start(true)
    expect(gameAutoAdvanceEnabled.value).toBe(true)
    abandonActiveGame()
    start()
    expect(gameAutoAdvanceEnabled.value).toBe(false)
    abandonActiveGame()
  })

  it('retains the preference when repeating the same game', () => {
    const first = start(true)
    finish()
    const replay = restartActiveGame([exercise])
    expect(replay.id).not.toBe(first.id)
    expect(gameAutoAdvanceEnabled.value).toBe(true)
    abandonActiveGame()
  })

  it('does not affect scoring or the ranking key', () => {
    start(false)
    const manual = finish()
    start(true)
    const automatic = finish()
    expect(automatic.score).toBe(manual.score)
    expect(getRankingKey(automatic)).toBe(getRankingKey(manual))
  })
})
