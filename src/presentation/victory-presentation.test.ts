import { describe, expect, it } from 'vitest'
import { getVictoryTier } from './victory-presentation'

describe('victory presentation', () => {
  it.each([
    [5, 5, 'perfect'], [20, 20, 'perfect'],
    [4, 5, 'epic'], [16, 20, 'epic'], [19, 20, 'epic'],
    [3, 5, 'complete'], [12, 20, 'complete'],
    [2, 5, 'practice'], [0, 5, 'practice'], [0, 0, 'practice'],
  ])('classifies %i of %i as %s', (correct, total, tier) => {
    expect(getVictoryTier(correct, total)).toBe(tier)
  })
})
