export type ExerciseType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'typed_answer'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'flashcard'

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface ContentTopicReference {
  id: string
  title: string
  packagePath: string
  contentVersion: string
}

export interface ContentSubject {
  id: string
  title: string
  topics: ContentTopicReference[]
}

export interface ContentManifest {
  schemaVersion: string
  contentVersion: string
  subjects: ContentSubject[]
}

export interface ContentOption {
  id: string
  text: string
}

export interface ExerciseBase {
  id: string
  type: ExerciseType
  conceptId: string
  learningObjectiveIds: string[]
  difficulty: ExerciseDifficulty
  tags: string[]
  instructionLanguage: string
  exerciseLanguage: string
  explanationLanguage: string
  prompt: string
  context?: string
  hints?: string[]
  explanation: string
  media?: { kind: 'image' | 'audio' | 'video'; src: string; alt?: string }[]
}

export interface SingleChoiceExercise extends ExerciseBase {
  type: 'single_choice'
  options: ContentOption[]
  correctOptionId: string
  answerVariants?: string[]
}

export interface FlashcardExercise extends ExerciseBase {
  type: 'flashcard'
  front: string
  back: string
}

export type Exercise = SingleChoiceExercise | FlashcardExercise

export function isSingleChoiceExercise(exercise: Exercise): exercise is SingleChoiceExercise {
  return exercise.type === 'single_choice'
}

export function isFlashcardExercise(exercise: Exercise): exercise is FlashcardExercise {
  return exercise.type === 'flashcard'
}

export interface ContentPackage {
  schemaVersion: string
  contentVersion: string
  subjectId: string
  topicId: string
  concepts: { id: string; label: string; description?: string }[]
  learningObjectives: { id: string; label: string }[]
  exercises: Exercise[]
}
