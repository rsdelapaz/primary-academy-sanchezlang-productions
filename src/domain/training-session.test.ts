import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ContentPackage, GameExercise, SingleChoiceExercise, TypedAnswerExercise } from './content'
import {
  advanceQuestion,
  answerQuestion,
  createGameSession,
  getCurrentQuestion,
  type GameSession,
} from './game'
import { evaluateGameAnswer } from './exercise-engine'
import { createTrainingItems, trainingAnswerText, trainingCorrectText } from './training-session'
import { createContentValidators } from '../content/validators.mjs'
import manifestSchema from '../content/manifest.schema.json'
import packageSchema from '../content/package.schema.json'

function choice(id: string, overrides: Partial<SingleChoiceExercise> = {}): SingleChoiceExercise {
  return {
    id,
    type: 'single_choice',
    conceptId: 'concept',
    difficulty: 'beginner',
    learningObjectiveIds: ['objective-one', 'objective-two'],
    tags: ['tag'],
    instructionLanguage: 'es',
    exerciseLanguage: 'es',
    explanationLanguage: 'es',
    prompt: `Pregunta ${id}`,
    explanation: 'Explicación de prueba.',
    options: [
      { id: 'a', text: 'Uno' },
      { id: 'b', text: 'Dos' },
      { id: 'c', text: 'Tres' },
      { id: 'd', text: 'Cuatro' },
    ],
    correctOptionId: 'b',
    ...overrides,
  }
}

function written(id: string, overrides: Partial<TypedAnswerExercise> = {}): TypedAnswerExercise {
  const exercise = choice(id)
  return {
    id,
    type: 'typed_answer',
    conceptId: exercise.conceptId,
    difficulty: exercise.difficulty,
    learningObjectiveIds: exercise.learningObjectiveIds,
    tags: exercise.tags,
    instructionLanguage: exercise.instructionLanguage,
    exerciseLanguage: exercise.exerciseLanguage,
    explanationLanguage: exercise.explanationLanguage,
    prompt: exercise.prompt,
    explanation: exercise.explanation,
    acceptedAnswers: ['Dos', '2'],
    ...overrides,
  }
}

function packageFor(exercises: ContentPackage['exercises'], overrides: Partial<ContentPackage> = {}): ContentPackage {
  return {
    subjectId: 'math',
    topicId: 'numbers',
    schemaVersion: '1.0.0',
    contentVersion: '1.0.0',
    concepts: [],
    learningObjectives: [],
    exercises,
    ...overrides,
  }
}

function start(exercises: GameExercise[], content = packageFor(exercises)): GameSession {
  const formats = new Set(exercises.map(({ type }) => type))
  return createGameSession({
    sessionId: 'source-game',
    subjectId: content.subjectId,
    topicId: content.topicId,
    contentVersion: content.contentVersion,
    modeId: 'treasure',
    configuration: {
      difficulty: 'all',
      duration: { kind: 'custom', questionCount: exercises.length },
      answerFormat: formats.size === 2 ? 'mixed' : formats.has('typed_answer') ? 'written' : 'selection',
    },
    exercises,
    random: () => .99,
  })
}

function finish(game: GameSession, correctIds: readonly string[] = []): GameSession {
  let current = game
  while (current.status === 'active') {
    const question = getCurrentQuestion(current)!
    const correct = correctIds.includes(question.exercise.id)
    const response = question.type === 'typed_answer'
      ? { type: 'typed_answer' as const, text: correct ? question.exercise.acceptedAnswers[0] : 'Otra respuesta' }
      : {
        type: 'single_choice' as const,
        optionId: correct ? question.exercise.correctOptionId : question.optionIds.find((id) => id !== question.exercise.correctOptionId)!,
      }
    current = advanceQuestion(answerQuestion(current, question.exercise.id, response))
  }
  return current
}

describe('training items from the original game', () => {
  it('returns all mistakes in their answer order, without truncation or correct answers', () => {
    const exercises = Array.from({ length: 8 }, (_, index) => choice(`q-${index}`))
    const game = finish(start(exercises), ['q-1'])
    const items = createTrainingItems(game, null, () => 0)
    expect(items).toHaveLength(7)
    expect(items.map(({ original }) => original.exercise.id)).toEqual(
      game.answers.filter(({ correct }) => !correct).map(({ exerciseId }) => exerciseId),
    )
    expect(items.every(({ isVariant }) => !isVariant)).toBe(true)
  })

  it('prefers a new compatible variant with the same set of learning objectives', () => {
    const original = choice('original', { context: 'situación inicial' })
    const seen = choice('already-seen')
    const valid = choice('variant', { learningObjectiveIds: ['objective-two', 'objective-one'] })
    const content = packageFor([
      original,
      seen,
      choice('wrong-concept', { conceptId: 'other' }),
      choice('wrong-difficulty', { difficulty: 'intermediate' }),
      choice('wrong-objectives', { learningObjectiveIds: ['objective-one'] }),
      choice('more-objectives', { learningObjectiveIds: ['objective-one', 'objective-two', 'extra'] }),
      written('wrong-format'),
      choice('duplicate-prompt', { prompt: '  Pregunta  original ', context: 'situación inicial' }),
      choice('duplicate-seen-prompt', { prompt: seen.prompt }),
      valid,
    ])
    const game = finish(start([original, seen], content), [seen.id])
    const [item] = createTrainingItems(game, content, () => 0)
    expect(item.original.exercise.id).toBe(original.id)
    expect(item.practice.exercise.id).toBe(valid.id)
    expect(item.isVariant).toBe(true)
    expect(item.practice.type).toBe('single_choice')
  })

  it('never repeats a variant across mistakes and falls back to the original', () => {
    const source = [choice('first'), choice('second')]
    const onlyVariant = choice('variant')
    const sameVisibleVariant = choice('duplicate', { prompt: onlyVariant.prompt })
    const content = packageFor([...source, onlyVariant, sameVisibleVariant])
    const game = finish(start(source, content))
    const items = createTrainingItems(game, content, () => 0)
    expect(items.map(({ isVariant }) => isVariant)).toEqual([true, false])
    expect(items[1].practice.exercise.id).toBe(items[1].original.exercise.id)
    expect(new Set(items.map(({ practice }) => practice.exercise.id)).size).toBe(2)
  })

  it.each([
    { subjectId: 'other' },
    { topicId: 'other' },
    { contentVersion: '2.0.0' },
  ])('uses the original question when content metadata does not match: %o', (overrides) => {
    const original = choice('original')
    const game = finish(start([original]))
    const [item] = createTrainingItems(game, packageFor([choice('variant')], overrides), () => 0)
    expect(item.isVariant).toBe(false)
    expect(item.practice.exercise.id).toBe(original.id)
  })

  it('reshuffles option IDs in practice without changing the original options or correcting by position', () => {
    const game = finish(start([choice('source')]))
    const [item] = createTrainingItems(game, undefined, () => 0)
    if (item.original.type !== 'single_choice' || item.practice.type !== 'single_choice') throw new Error('Expected a choice.')
    expect(item.original.optionIds).toEqual(['a', 'b', 'c', 'd'])
    expect(item.practice.optionIds).toEqual(['b', 'c', 'd', 'a'])
    const correct = evaluateGameAnswer(item.practice.exercise, { type: 'single_choice', optionId: 'b' })
    expect(correct.correct).toBe(true)
    expect(trainingAnswerText(item.original, item.answer)).toBe('Uno')
    expect(trainingCorrectText(item.practice)).toBe('Dos')
  })

  it('keeps written practice as a written question and displays actual submitted/accepted text', () => {
    const original = written('written-original')
    const variant = written('written-variant', { acceptedAnswers: ['Cuatro', '4'] })
    const content = packageFor([original, variant])
    const game = finish(start([original], content))
    const [item] = createTrainingItems(game, content, () => 0)
    expect(item.practice.type).toBe('typed_answer')
    expect(item.isVariant).toBe(true)
    expect(trainingAnswerText(item.original, item.answer)).toBe('Otra respuesta')
    expect(trainingCorrectText(item.original)).toBe('Dos / 2')
    expect(trainingCorrectText(item.practice)).toBe('Cuatro / 4')
    expect(evaluateGameAnswer(item.practice.exercise, { type: 'typed_answer', text: ' cuatro  ' }).correct).toBe(true)
  })

  it('preserves each exercise format in a mixed game rather than applying a new type quota', () => {
    const originalChoice = choice('source-choice')
    const originalWritten = written('source-written')
    const practiceChoice = choice('practice-choice')
    const practiceWritten = written('practice-written')
    const content = packageFor([originalChoice, originalWritten, practiceChoice, practiceWritten])
    const game = finish(start([originalChoice, originalWritten], content))
    const items = createTrainingItems(game, content, () => 0)
    expect(items.map(({ original, practice }) => [original.type, practice.type])).toEqual([
      ['single_choice', 'single_choice'], ['typed_answer', 'typed_answer'],
    ])
    expect(items.every(({ isVariant }) => isVariant)).toBe(true)
    expect(() => evaluateGameAnswer(items[0].practice.exercise, { type: 'typed_answer', text: 'Dos' })).toThrow()
    expect(() => evaluateGameAnswer(items[1].practice.exercise, { type: 'typed_answer', text: '  ' })).toThrow()
  })

  it('does not mutate the completed game, its result, treasure state or the bank', () => {
    const source = choice('source')
    const variant = choice('variant')
    const content = packageFor([source, variant])
    const game = finish(start([source], content))
    const gameBefore = structuredClone(game)
    const contentBefore = structuredClone(content)
    const [item] = createTrainingItems(game, content, () => 0)
    item.original.exercise.tags.push('changed')
    item.practice.exercise.learningObjectiveIds.push('changed')
    item.answer.correct = true
    if (item.practice.type === 'single_choice') item.practice.exercise.options[0].text = 'changed'
    expect(game).toEqual(gameBefore)
    expect(content).toEqual(contentBefore)
  })

  it('returns no items for a perfect game and rejects an active or abandoned session', () => {
    const active = start([choice('source')])
    expect(createTrainingItems(finish(active, ['source']))).toEqual([])
    expect(() => createTrainingItems(active)).toThrow(/Termina la partida/)
    expect(() => createTrainingItems({ ...active, status: 'abandoned' })).toThrow(/Termina la partida/)
  })
})

describe('training with real validated content', () => {
  const validators = createContentValidators(manifestSchema, packageSchema)
  const manifest = validators.validateManifest(JSON.parse(readFileSync('public/content/manifest.json', 'utf8')) as unknown)

  it.each([
    ['mathematics', 'math-t2-mul-terms-01'],
    ['english', 'eng-pa12-b-s-pi-go'],
  ])('allows a genuinely unseen compatible variation of %s', (subjectId, exerciseId) => {
    const subject = manifest.subjects.find(({ id }) => id === subjectId)!
    const topic = subject.topics[0]
    const raw: unknown = JSON.parse(readFileSync(`public/${topic.packagePath}`, 'utf8'))
    const content = validators.validatePackage(raw, { ...topic, subjectId, topicId: topic.id })
    const exercise = content.exercises.find(({ id }) => id === exerciseId)
    if (!exercise || exercise.type === 'flashcard') throw new Error('Expected a game exercise.')
    const game = finish(start([exercise], content))
    const [item] = createTrainingItems(game, content, () => .5)
    expect(item.isVariant).toBe(true)
    expect(item.practice.exercise.id).not.toBe(exercise.id)
    expect(item.practice.exercise.prompt).not.toBe(exercise.prompt)
    expect(item.practice.exercise.conceptId).toBe(exercise.conceptId)
    expect(item.practice.exercise.type).toBe(exercise.type)
    expect(item.practice.exercise.difficulty).toBe(exercise.difficulty)
    expect(new Set(item.practice.exercise.learningObjectiveIds)).toEqual(new Set(exercise.learningObjectiveIds))
  })
})
