import { describe, expect, it } from 'vitest'
import type { GameConfiguration, DifficultyFilter } from '../domain/game'
import type { ExerciseDifficulty, GameExercise, SingleChoiceExercise, TypedAnswerExercise } from '../domain/content'
import { getQuestionHistoryKey, selectGameQuestions, VERB_FAMILY_TAGS } from './question-selection'

const fixedRandom = () => 0.31

function choice(
  id: string,
  conceptId: string,
  tags: string[] = [],
  difficulty: ExerciseDifficulty = 'beginner',
): SingleChoiceExercise {
  return {
    id,
    type: 'single_choice',
    conceptId,
    learningObjectiveIds: ['objective'],
    difficulty,
    tags,
    instructionLanguage: 'es',
    exerciseLanguage: 'en',
    explanationLanguage: 'es',
    prompt: `Prompt ${id}`,
    explanation: 'Explicación',
    options: [
      { id: `${id}-a`, text: 'a' },
      { id: `${id}-b`, text: 'b' },
    ],
    correctOptionId: `${id}-a`,
  }
}

function written(
  id: string,
  conceptId: string,
  tags: string[] = [],
  difficulty: ExerciseDifficulty = 'intermediate',
): TypedAnswerExercise {
  return {
    id,
    type: 'typed_answer',
    conceptId,
    learningObjectiveIds: ['objective'],
    difficulty,
    tags,
    instructionLanguage: 'es',
    exerciseLanguage: 'en',
    explanationLanguage: 'es',
    prompt: `Prompt ${id}`,
    explanation: 'Explicación',
    acceptedAnswers: ['answer'],
  }
}

function config(
  answerFormat: GameConfiguration['answerFormat'],
  count: number,
  difficulty: DifficultyFilter = 'all',
): GameConfiguration {
  return {
    duration: { kind: 'custom', questionCount: count },
    difficulty,
    answerFormat,
  }
}

function select(exercises: readonly GameExercise[], configuration: GameConfiguration, extra: {
  subjectId?: string
  history?: Record<string, { day: string; lastShownAt: string }>
  now?: Date
} = {}): GameExercise[] {
  return selectGameQuestions({
    subjectId: extra.subjectId ?? 'english',
    topicId: 'irregular-verbs',
    modeId: 'classic',
    configuration,
    exercises,
    history: extra.history ?? {},
    now: extra.now ?? new Date(2026, 8, 24, 12),
    random: fixedRandom,
  })
}

describe('selectGameQuestions', () => {
  it('covers all available verb families in a short selection game without repeating verbs', () => {
    const exercises = VERB_FAMILY_TAGS.map((family, index) =>
      choice(`family-${index}`, `verb-${index}`, [family]),
    )
    exercises.push(choice('extra', 'verb-extra', [VERB_FAMILY_TAGS[0]]))

    const selected = select(exercises, {
      ...config('selection', 5, 'beginner'),
      duration: { kind: 'preset', preset: 'short', questionCount: 5 },
    })

    expect(selected).toHaveLength(5)
    expect(new Set(selected.map(({ conceptId }) => conceptId)).size).toBe(5)
    expect(new Set(selected.flatMap(({ tags }) => tags.filter((tag) =>
      VERB_FAMILY_TAGS.includes(tag as typeof VERB_FAMILY_TAGS[number]),
    )))).toEqual(new Set(VERB_FAMILY_TAGS))
  })

  it('keeps the configured mixed answer distribution while spreading short-game families', () => {
    const exercises: GameExercise[] = [
      choice('family-a', 'verb-a', [VERB_FAMILY_TAGS[0]], 'intermediate'),
      choice('family-b', 'verb-b', [VERB_FAMILY_TAGS[1]], 'intermediate'),
      written('family-c', 'verb-c', [VERB_FAMILY_TAGS[2]]),
      written('family-d', 'verb-d', [VERB_FAMILY_TAGS[3]]),
      choice('extra', 'verb-extra', [VERB_FAMILY_TAGS[0]], 'intermediate'),
    ]

    const selected = select(exercises, {
      ...config('mixed', 5, 'intermediate'),
      duration: { kind: 'preset', preset: 'short', questionCount: 5 },
    })

    expect(selected.filter(({ type }) => type === 'single_choice')).toHaveLength(3)
    expect(selected.filter(({ type }) => type === 'typed_answer')).toHaveLength(2)
    expect(new Set(selected.flatMap(({ tags }) => tags.filter((tag) =>
      VERB_FAMILY_TAGS.includes(tag as typeof VERB_FAMILY_TAGS[number]),
    )))).toEqual(new Set(VERB_FAMILY_TAGS))
  })

  it('keeps easy and hard sessions limited to their configured answer types', () => {
    const exercises: GameExercise[] = [
      choice('easy-a', 'easy-a', [], 'beginner'),
      choice('easy-b', 'easy-b', [], 'beginner'),
      written('hard-a', 'hard-a', [], 'advanced'),
      written('hard-b', 'hard-b', [], 'advanced'),
    ]

    expect(select(exercises, config('selection', 2, 'beginner')).every(({ type }) =>
      type === 'single_choice',
    )).toBe(true)
    expect(select(exercises, config('written', 2, 'advanced')).every(({ type }) =>
      type === 'typed_answer',
    )).toBe(true)
  })

  it('prioritizes questions not shown today and then the least recently shown ones', () => {
    const exercises = [
      choice('shown-newest', 'verb-a'),
      choice('shown-oldest', 'verb-b'),
      choice('not-shown', 'verb-c'),
    ]
    const history = {
      [getQuestionHistoryKey('english', 'irregular-verbs', exercises[0])]: {
        day: '2026-09-24',
        lastShownAt: '2026-09-24T11:00:00.000Z',
      },
      [getQuestionHistoryKey('english', 'irregular-verbs', exercises[1])]: {
        day: '2026-09-24',
        lastShownAt: '2026-09-24T08:00:00.000Z',
      },
    }

    expect(select(exercises, config('selection', 1), { history }).map(({ id }) => id)).toEqual(['not-shown'])
    expect(select(exercises.slice(0, 2), config('selection', 1), { history }).map(({ id }) => id))
      .toEqual(['shown-oldest'])
  })

  it('treats a new local day as unseen and reuses exhausted questions without blocking', () => {
    const exercises = [choice('yesterday', 'verb-a'), choice('today', 'verb-b')]
    const history = {
      [getQuestionHistoryKey('english', 'irregular-verbs', exercises[0])]: {
        day: '2026-09-23',
        lastShownAt: '2026-09-23T12:00:00.000Z',
      },
      [getQuestionHistoryKey('english', 'irregular-verbs', exercises[1])]: {
        day: '2026-09-24',
        lastShownAt: '2026-09-24T11:00:00.000Z',
      },
    }

    expect(select(exercises, config('selection', 1), { history }).map(({ id }) => id)).toEqual(['yesterday'])
    expect(select([exercises[1]], config('selection', 1), { history })).toHaveLength(1)
  })

  it('uses concept and family to equate differently identified English exercises', () => {
    const first = choice('variant-a', 'verb-go', [VERB_FAMILY_TAGS[0]])
    const second = written('variant-b', 'verb-go', [VERB_FAMILY_TAGS[0]])

    expect(getQuestionHistoryKey('english', 'irregular-verbs', first))
      .toBe(getQuestionHistoryKey('english', 'irregular-verbs', second))
  })

  it('does not alter the existing mathematics candidate pool', () => {
    const exercises = [
      choice('math-a', 'math-a'),
      choice('math-b', 'math-b'),
      choice('math-c', 'math-c'),
    ]

    expect(select(exercises, config('selection', 1), { subjectId: 'mathematics' }))
      .toEqual(exercises)
  })
})
