import { describe, expect, it } from 'vitest'
import { mapQuickSetupToGameConfiguration } from './quick-game-setup'

const durations = [
  { id: 'short', questionCount: 5 },
  { id: 'medium', questionCount: 10 },
  { id: 'long', questionCount: 20 },
] as const

const difficulties = [
  { id: 'easy', difficulty: 'beginner', answerFormat: 'selection' },
  { id: 'medium', difficulty: 'intermediate', answerFormat: 'mixed' },
  { id: 'hard', difficulty: 'advanced', answerFormat: 'written' },
] as const

describe('mapQuickSetupToGameConfiguration', () => {
  for (const duration of durations) {
    for (const difficulty of difficulties) {
      it(`maps ${duration.id} duration with ${difficulty.id} difficulty`, () => {
        expect(mapQuickSetupToGameConfiguration({
          duration: duration.id,
          difficulty: difficulty.id,
        })).toEqual({
          duration: {
            kind: 'preset',
            preset: duration.id,
            questionCount: duration.questionCount,
          },
          difficulty: difficulty.difficulty,
          answerFormat: difficulty.answerFormat,
        })
      })
    }
  }
})
