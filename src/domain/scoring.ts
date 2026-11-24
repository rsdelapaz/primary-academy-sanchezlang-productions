export const SCORING_VERSION = '1'
export const POINTS_PER_CORRECT_ANSWER = 100

export function pointsForEvaluation(correct: boolean): number {
  return correct ? POINTS_PER_CORRECT_ANSWER : 0
}
