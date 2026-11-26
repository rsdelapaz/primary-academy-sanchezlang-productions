import { describe, expect, it } from 'vitest'
import {
  isSingleChoiceExercise,
  type ContentManifest,
  type ContentPackage,
  type ContentSubject,
  type ContentTopicReference,
  type FlashcardExercise,
  type SingleChoiceExercise,
} from '../domain/content'
import { findRecommendedChallenge } from './recommended-challenge'

function packageWithDifficulty(
  subject: ContentSubject,
  topic: ContentTopicReference,
  difficulties: SingleChoiceExercise['difficulty'][],
): ContentPackage {
  return {
    schemaVersion: '1.0.0',
    contentVersion: topic.contentVersion,
    subjectId: subject.id,
    topicId: topic.id,
    concepts: [],
    learningObjectives: [],
    exercises: difficulties.map((difficulty, index) => ({
      id: `${topic.id}-${index}`,
      type: 'single_choice',
      conceptId: 'concept',
      learningObjectiveIds: [],
      difficulty,
      tags: [],
      instructionLanguage: 'es',
      exerciseLanguage: 'es',
      explanationLanguage: 'es',
      prompt: 'Pregunta',
      explanation: 'Explicación',
      options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
      correctOptionId: 'a',
    })),
  }
}

function technicalFlashcard(source: SingleChoiceExercise, id: string): FlashcardExercise {
  return {
    id,
    type: 'flashcard',
    conceptId: source.conceptId,
    learningObjectiveIds: source.learningObjectiveIds,
    difficulty: source.difficulty,
    tags: [],
    instructionLanguage: 'es',
    exerciseLanguage: 'en',
    explanationLanguage: 'es',
    prompt: 'Technical fixture',
    explanation: 'Technical fixture only.',
    front: 'go',
    back: 'went',
  }
}

function catalog(): ContentManifest {
  return {
    schemaVersion: '1.0.0',
    contentVersion: '1.0.0',
    subjects: [
      {
        id: 'subject-a',
        title: 'Materia A',
        topics: [{ id: 'topic-a', title: 'Tema A', packagePath: 'a.json', contentVersion: '1.0.0' }],
      },
      {
        id: 'subject-b',
        title: 'Materia B',
        topics: [{ id: 'topic-b', title: 'Tema B', packagePath: 'b.json', contentVersion: '1.0.0' }],
      },
    ],
  }
}

describe('recommended challenge', () => {
  it('skips banks without beginner exercises and selects the first compatible package', async () => {
    const calls: string[] = []
    const recommendation = await findRecommendedChallenge(catalog(), async (subject, topic) => {
      calls.push(topic.id)
      return packageWithDifficulty(subject, topic, subject.id === 'subject-a'
        ? ['intermediate']
        : Array.from({ length: 12 }, () => 'beginner'))
    })

    expect(calls).toEqual(['topic-a', 'topic-b'])
    expect(recommendation.subject.id).toBe('subject-b')
    expect(recommendation.configuration).toEqual({
      difficulty: 'beginner',
      answerFormat: 'selection',
      duration: { kind: 'preset', preset: 'medium', questionCount: 10 },
    })
  })

  it('uses the available count when fewer than ten beginner exercises exist', async () => {
    const recommendation = await findRecommendedChallenge(catalog(), async (subject, topic) =>
      packageWithDifficulty(subject, topic, Array.from({ length: 3 }, () => 'beginner')))

    expect(recommendation.configuration.duration).toEqual({ kind: 'custom', questionCount: 3 })
  })

  it('counts only single-choice exercises in mixed and flashcard-only packages', async () => {
    const recommendation = await findRecommendedChallenge(catalog(), async (subject, topic) => {
      const bank = packageWithDifficulty(subject, topic, ['beginner', 'beginner'])
      if (subject.id === 'subject-a') {
        return {
          ...bank,
          exercises: bank.exercises
            .filter(isSingleChoiceExercise)
            .map((exercise) => technicalFlashcard(exercise, exercise.id)),
        }
      }
      const singleChoice = bank.exercises.filter(isSingleChoiceExercise)
      return {
        ...bank,
        exercises: [
          technicalFlashcard(singleChoice[0]!, 'technical-flashcard'),
          singleChoice[1]!,
        ],
      }
    })

    expect(recommendation.subject.id).toBe('subject-b')
    expect(recommendation.configuration.duration).toEqual({ kind: 'custom', questionCount: 1 })
  })
})
