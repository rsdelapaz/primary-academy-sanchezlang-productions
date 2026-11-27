/** Presentation-only distinction: never changes score or ranking. */
export type VictoryTier = 'perfect' | 'epic' | 'complete' | 'practice'

export function getVictoryTier(correctCount: number, totalQuestions: number): VictoryTier {
  if (totalQuestions <= 0) return 'practice'
  if (correctCount === totalQuestions) return 'perfect'
  const ratio = correctCount / totalQuestions
  if (ratio >= 0.8) return 'epic'
  if (ratio >= 0.6) return 'complete'
  return 'practice'
}

export const VICTORY_TITLES: Record<VictoryTier, string> = {
  perfect: '¡MISIÓN PERFECTA!',
  epic: '¡MISIÓN ÉPICA!',
  complete: '¡MISIÓN SUPERADA!',
  practice: '¡MISIÓN COMPLETADA!',
}
