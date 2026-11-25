import type { ExerciseDifficulty, ExerciseBase } from './content'

export type DurationPreset = 'short' | 'medium' | 'long'
export type DifficultyFilter = ExerciseDifficulty | 'all'

export interface ActivityConfiguration {
  duration: { kind: 'preset'; preset: DurationPreset; questionCount: number }
    | { kind: 'custom'; questionCount: number }
  difficulty: DifficultyFilter
}

export const DURATION_PRESETS = [
  { id: 'short', title: 'Corta', count: 5 },
  { id: 'medium', title: 'Media', count: 10 },
  { id: 'long', title: 'Larga', count: 20 },
] as const

export function getPresetCount(preset: DurationPreset): number {
  const definition = DURATION_PRESETS.find(({ id }) => id === preset)
  if (!definition) throw new Error(`Duración predefinida desconocida: ${preset}`)
  return definition.count
}

export function getEligibleExercises<T extends Pick<ExerciseBase, 'difficulty'>>(
  exercises: readonly T[],
  difficulty: DifficultyFilter,
): T[] {
  return exercises.filter((exercise) => difficulty === 'all' || exercise.difficulty === difficulty)
}
