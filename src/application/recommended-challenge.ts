import {
  DURATION_PRESETS,
  QUICK_PLAY_COUNT,
  getEligibleExercises,
  type GameConfiguration,
  type GameModeId,
} from '../domain/game'
import type { ContentService } from '../content/service'
import type { ContentManifest, ContentPackage, ContentSubject, ContentTopicReference } from '../domain/content'

export interface RecommendedChallenge {
  subject: ContentSubject
  topic: ContentTopicReference
  content: ContentPackage
  modeId: GameModeId
  configuration: GameConfiguration
}

export async function findRecommendedChallenge(
  manifest: ContentManifest,
  loadPackage: ContentService['loadPackage'],
): Promise<RecommendedChallenge> {
  for (const subject of manifest.subjects) {
    for (const topic of subject.topics) {
      const content = await loadPackage(subject, topic)
      const eligible = getEligibleExercises(content.exercises, 'beginner')
      if (!eligible.length) continue

      const questionCount = Math.min(QUICK_PLAY_COUNT, eligible.length)
      const preset = DURATION_PRESETS.find(({ count }) => count === questionCount)
      const configuration: GameConfiguration = {
        duration: preset
          ? { kind: 'preset', preset: preset.id, questionCount }
          : { kind: 'custom', questionCount },
        difficulty: 'beginner',
      }

      return { subject, topic, content, modeId: 'classic', configuration }
    }
  }

  throw new Error('No hay ejercicios iniciales compatibles en el catálogo.')
}
