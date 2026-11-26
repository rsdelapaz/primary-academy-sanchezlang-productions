import { getEligibleExercises } from '../domain/activity-configuration'
import type { GameConfiguration, GameModeId } from '../domain/game'
import { getMixedExerciseDistribution } from '../domain/game'
import { isGameModeCompatible } from '../domain/game-modes'
import type { GameExercise } from '../domain/content'
import { fisherYates, type RandomSource } from '../domain/random'

export const VERB_FAMILY_TAGS = [
  'infinitive-to-past',
  'infinitive-to-participle',
  'past-to-infinitive',
  'participle-to-infinitive',
] as const

export interface QuestionHistoryEntry {
  day: string
  lastShownAt: string
}

export type QuestionHistory = Readonly<Record<string, QuestionHistoryEntry>>

export interface SelectGameQuestionsInput {
  subjectId: string
  topicId: string
  modeId: GameModeId
  configuration: GameConfiguration
  exercises: readonly GameExercise[]
  history: QuestionHistory
  now?: Date
  random?: RandomSource
}

type AnswerType = GameExercise['type']
type RemainingByType = Partial<Record<AnswerType, number>>

export function getQuestionHistoryKey(
  subjectId: string,
  topicId: string,
  exercise: GameExercise,
): string {
  const family = subjectId === 'english'
    ? exercise.tags.find((tag) => isVerbFamilyTag(tag))
    : undefined
  if (family) {
    return `english:${normalizeKeyPart(exercise.conceptId)}:${family.toLowerCase()}`
  }
  return `${normalizeKeyPart(subjectId)}:${normalizeKeyPart(topicId)}:${normalizeKeyPart(exercise.id)}`
}

export function selectGameQuestions(input: SelectGameQuestionsInput): GameExercise[] {
  const eligible = getEligibleExercises(input.exercises, input.configuration.difficulty)
    .filter((exercise) => isGameModeCompatible(input.modeId, exercise.type))
  const count = input.configuration.duration.questionCount
  const targets = getTypeTargets(eligible, count, input.configuration.answerFormat)
  const filtered = eligible.filter((exercise) => (targets[exercise.type] ?? 0) > 0)
  if (filtered.length < count) {
    throw new Error('No hay suficientes preguntas compatibles para esta partida.')
  }

  if (input.subjectId !== 'english') return [...eligible]

  const now = input.now ?? new Date()
  const day = getLocalDayKey(now)
  const random = input.random ?? Math.random
  const selected: GameExercise[] = []
  const remaining = { ...targets }
  const selectedIds = new Set<string>()
  const selectedVerbs = new Set<string>()

  if (count === 5 && input.configuration.duration.kind === 'preset' &&
    input.configuration.duration.preset === 'short') {
    const coverage = selectFamilyCoverage({
      eligible: filtered,
      targets: remaining,
      subjectId: input.subjectId,
      topicId: input.topicId,
      history: input.history,
      day,
      random,
    })
    for (const exercise of coverage) addSelected(exercise, selected, selectedIds, selectedVerbs, input.subjectId)
    for (const exercise of coverage) remaining[exercise.type] = (remaining[exercise.type] ?? 0) - 1
  }

  for (const [type, target] of Object.entries(remaining) as [AnswerType, number][]) {
    const pool = orderedCandidates(
      filtered.filter((exercise) => exercise.type === type && !selectedIds.has(exercise.id)),
      input,
      day,
      random,
      selectedVerbs,
    )
    for (const exercise of pool.slice(0, target)) {
      addSelected(exercise, selected, selectedIds, selectedVerbs, input.subjectId)
    }
    if (pool.length < target) {
      throw new Error('No hay suficientes preguntas compatibles para esta partida.')
    }
  }

  return fisherYates(selected, random)
}

function getTypeTargets(
  eligible: readonly GameExercise[],
  count: number,
  answerFormat: GameConfiguration['answerFormat'],
): RemainingByType {
  if (answerFormat === 'selection') return { single_choice: count }
  if (answerFormat === 'written') return { typed_answer: count }
  const distribution = getMixedExerciseDistribution(eligible, count)
  if (distribution.singleChoice === 0 || distribution.typedAnswer === 0 ||
    distribution.singleChoice + distribution.typedAnswer !== count) {
    throw new Error('El banco compatible no permite completar una partida mixta con ambos tipos de respuesta.')
  }
  return {
    single_choice: distribution.singleChoice,
    typed_answer: distribution.typedAnswer,
  }
}

function selectFamilyCoverage(input: {
  eligible: readonly GameExercise[]
  targets: RemainingByType
  subjectId: string
  topicId: string
  history: QuestionHistory
  day: string
  random: RandomSource
}): GameExercise[] {
  const families = fisherYates(
    VERB_FAMILY_TAGS.filter((family) => input.eligible.some((exercise) =>
      exercise.tags.some((tag) => tag.toLowerCase() === family) &&
      (input.targets[exercise.type] ?? 0) > 0,
    )),
    input.random,
  )
  if (families.length < 2) return []

  const byFamily = new Map<string, GameExercise[]>()
  for (const family of families) {
    const familyExercises = input.eligible.filter((exercise) =>
      exercise.tags.some((tag) => tag.toLowerCase() === family) &&
      (input.targets[exercise.type] ?? 0) > 0,
    )
    const distinctByTypeAndVerb = new Map<string, GameExercise>()
    for (const exercise of fisherYates(familyExercises, input.random)) {
      const key = `${getVerbKey(exercise)}:${exercise.type}`
      const existing = distinctByTypeAndVerb.get(key)
      if (!existing || isPreferred(exercise, existing, input, input.day)) {
        distinctByTypeAndVerb.set(key, exercise)
      }
    }
    byFamily.set(family, [...distinctByTypeAndVerb.values()])
  }

  let best: GameExercise[] = []
  const search = (
    index: number,
    remaining: RemainingByType,
    selected: GameExercise[],
    verbs: Set<string>,
  ): GameExercise[] | null => {
    if (selected.length > best.length) best = [...selected]
    if (selected.length === families.length) return [...selected]
    if (index >= families.length || selected.length + families.length - index <= best.length) return null

    const family = families[index]
    const candidates = orderedCandidates(
      (byFamily.get(family) ?? []).filter((exercise) => (remaining[exercise.type] ?? 0) > 0),
      input,
      input.day,
      input.random,
      verbs,
    )
    for (const exercise of candidates) {
      const nextRemaining = { ...remaining, [exercise.type]: (remaining[exercise.type] ?? 0) - 1 }
      const nextVerbs = new Set(verbs)
      nextVerbs.add(getVerbKey(exercise))
      const result = search(index + 1, nextRemaining, [...selected, exercise], nextVerbs)
      if (result) return result
    }
    return search(index + 1, remaining, selected, verbs)
  }

  return search(0, input.targets, [], new Set()) ?? best
}

function orderedCandidates(
  candidates: readonly GameExercise[],
  input: Pick<SelectGameQuestionsInput, 'subjectId' | 'topicId' | 'history'>,
  day: string,
  random: RandomSource,
  selectedVerbs: ReadonlySet<string>,
): GameExercise[] {
  return fisherYates([...candidates], random).sort((left, right) => {
    const leftDuplicate = selectedVerbs.has(getVerbKey(left)) ? 1 : 0
    const rightDuplicate = selectedVerbs.has(getVerbKey(right)) ? 1 : 0
    if (leftDuplicate !== rightDuplicate) return leftDuplicate - rightDuplicate
    const leftHistory = input.history[getQuestionHistoryKey(input.subjectId, input.topicId, left)]
    const rightHistory = input.history[getQuestionHistoryKey(input.subjectId, input.topicId, right)]
    const leftShownToday = leftHistory?.day === day ? 1 : 0
    const rightShownToday = rightHistory?.day === day ? 1 : 0
    if (leftShownToday !== rightShownToday) return leftShownToday - rightShownToday
    return (leftHistory?.lastShownAt ?? '').localeCompare(rightHistory?.lastShownAt ?? '')
  })
}

function isPreferred(
  candidate: GameExercise,
  current: GameExercise,
  input: {
    subjectId: string
    topicId: string
    history: QuestionHistory
  },
  day: string,
): boolean {
  const candidateHistory = input.history[getQuestionHistoryKey(input.subjectId, input.topicId, candidate)]
  const currentHistory = input.history[getQuestionHistoryKey(input.subjectId, input.topicId, current)]
  if (candidateHistory?.day === day && currentHistory?.day !== day) return false
  if (currentHistory?.day === day && candidateHistory?.day !== day) return true
  return (candidateHistory?.lastShownAt ?? '') < (currentHistory?.lastShownAt ?? '')
}

function addSelected(
  exercise: GameExercise,
  selected: GameExercise[],
  selectedIds: Set<string>,
  selectedVerbs: Set<string>,
  subjectId: string,
): void {
  if (selectedIds.has(exercise.id)) return
  selected.push(exercise)
  selectedIds.add(exercise.id)
  if (subjectId === 'english') selectedVerbs.add(getVerbKey(exercise))
}

function getVerbKey(exercise: GameExercise): string {
  return normalizeKeyPart(exercise.conceptId)
}

function isVerbFamilyTag(tag: string): boolean {
  return VERB_FAMILY_TAGS.includes(tag.toLowerCase() as typeof VERB_FAMILY_TAGS[number])
}

function normalizeKeyPart(value: string): string {
  return value.trim().normalize('NFC').toLowerCase()
}

export function getLocalDayKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
