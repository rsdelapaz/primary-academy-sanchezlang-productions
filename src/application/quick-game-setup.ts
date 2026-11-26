import { getPresetCount, type DurationPreset } from '../domain/activity-configuration'
import type { GameConfiguration } from '../domain/game'

export type QuickSetupDifficulty = 'easy' | 'medium' | 'hard'

export interface QuickGameSetup {
  duration: DurationPreset
  difficulty: QuickSetupDifficulty
}

const difficultySettings = {
  easy: { difficulty: 'beginner', answerFormat: 'selection' },
  medium: { difficulty: 'intermediate', answerFormat: 'mixed' },
  hard: { difficulty: 'advanced', answerFormat: 'written' },
} as const satisfies Record<QuickSetupDifficulty, Pick<GameConfiguration, 'difficulty' | 'answerFormat'>>

export function mapQuickSetupToGameConfiguration(setup: QuickGameSetup): GameConfiguration {
  return {
    duration: {
      kind: 'preset',
      preset: setup.duration,
      questionCount: getPresetCount(setup.duration),
    },
    ...difficultySettings[setup.difficulty],
  }
}
