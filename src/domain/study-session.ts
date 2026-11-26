import type { FlashcardExercise } from './content'
import {
  getEligibleExercises,
  getPresetCount,
  type ActivityConfiguration,
} from './activity-configuration'
import { fisherYates, type RandomSource } from './random'

export type StudyPhase = 'front' | 'back' | 'completed'
export type StudyCardOutcome = 'remembered' | 'pending-review'

export interface StudyCardProgress {
  exercise: FlashcardExercise
  presentations: number
  outcome: StudyCardOutcome | null
}

export interface StudySession {
  id: string
  subjectId: string
  topicId: string
  contentVersion: string
  configuration: ActivityConfiguration
  status: 'active' | 'completed'
  phase: StudyPhase
  cards: StudyCardProgress[]
  queue: string[]
  currentCardId: string | null
  repetitionCount: number
  endedEarly: boolean
  startedAt: string
  finishedAt: string | null
}

export interface CreateStudySessionInput {
  sessionId: string
  subjectId: string
  topicId: string
  contentVersion: string
  configuration: ActivityConfiguration
  flashcards: readonly FlashcardExercise[]
  random?: RandomSource
  startedAt?: string
}

export interface StudyStats {
  rememberedCount: number
  pendingCount: number
  completedCount: number
  totalCards: number
  repetitionCount: number
  progressPercent: number
}

export const MAX_STUDY_CARD_PRESENTATIONS = 3

export function createStudySession(input: CreateStudySessionInput): StudySession {
  if (!input.sessionId.trim() || !input.subjectId.trim() || !input.topicId.trim() || !input.contentVersion.trim()) {
    throw new Error('El estudio requiere IDs y versión de contenido.')
  }
  const count = input.configuration.duration.questionCount
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('La duración debe ser un entero positivo.')
  if (input.configuration.duration.kind === 'preset' &&
    count !== getPresetCount(input.configuration.duration.preset)) {
    throw new Error('La cantidad no coincide con la duración predefinida.')
  }
  if (input.configuration.duration.kind !== 'preset' && input.configuration.duration.kind !== 'custom') {
    throw new Error('El tipo de duración no es válido.')
  }
  if (input.flashcards.some(({ type }) => type !== 'flashcard')) {
    throw new Error('La sesión de estudio solo admite flashcards.')
  }
  if (input.flashcards.some(({ id }) => !id.trim())) throw new Error('El banco contiene identificadores de tarjetas vacíos.')
  if (new Set(input.flashcards.map(({ id }) => id)).size !== input.flashcards.length) {
    throw new Error('El banco contiene identificadores de tarjetas duplicados.')
  }
  if (input.flashcards.some(({ front, back }) => !front.trim() || !back.trim())) {
    throw new Error('Cada tarjeta requiere un anverso y un reverso.')
  }

  const eligible = getEligibleExercises(input.flashcards, input.configuration.difficulty)
  if (count > eligible.length) throw new Error('El estudio no puede superar las tarjetas compatibles disponibles.')

  const selected = fisherYates(eligible, input.random ?? Math.random).slice(0, count)
  const cards = selected.map((exercise, index): StudyCardProgress => ({
    exercise: copyFlashcard(exercise),
    presentations: index === 0 ? 1 : 0,
    outcome: null,
  }))

  return {
    id: input.sessionId,
    subjectId: input.subjectId,
    topicId: input.topicId,
    contentVersion: input.contentVersion,
    configuration: {
      ...input.configuration,
      duration: { ...input.configuration.duration },
    },
    status: 'active',
    phase: 'front',
    cards,
    queue: cards.map(({ exercise }) => exercise.id),
    currentCardId: cards[0]?.exercise.id ?? null,
    repetitionCount: 0,
    endedEarly: false,
    startedAt: input.startedAt ?? new Date().toISOString(),
    finishedAt: null,
  }
}

export function getCurrentStudyCard(session: StudySession): StudyCardProgress | undefined {
  if (!session.currentCardId) return undefined
  return session.cards.find(({ exercise }) => exercise.id === session.currentCardId)
}

export function getStudyStats(session: StudySession): StudyStats {
  const rememberedCount = session.cards.filter(({ outcome }) => outcome === 'remembered').length
  const pendingCount = session.cards.filter(({ outcome }) => outcome === 'pending-review').length
  const completedCount = rememberedCount + pendingCount
  return {
    rememberedCount,
    pendingCount,
    completedCount,
    totalCards: session.cards.length,
    repetitionCount: session.repetitionCount,
    progressPercent: Math.round((completedCount / session.cards.length) * 100),
  }
}

export function revealStudyCard(session: StudySession): StudySession {
  assertActive(session)
  if (session.phase !== 'front' || !getCurrentStudyCard(session)) {
    throw new Error('No hay una tarjeta para revelar.')
  }
  return { ...session, phase: 'back' }
}

export function rateStudyCard(
  session: StudySession,
  remembered: boolean,
  finishedAt?: string,
): StudySession {
  assertActive(session)
  if (session.phase !== 'back') throw new Error('Revela la respuesta antes de autoevaluarte.')
  const current = getCurrentStudyCard(session)
  if (!current || session.queue[0] !== current.exercise.id) {
    throw new Error('La tarjeta actual no coincide con la cola de estudio.')
  }

  let cards = session.cards
  let queue = session.queue.slice(1)
  if (remembered || current.presentations >= MAX_STUDY_CARD_PRESENTATIONS) {
    const outcome: StudyCardOutcome = remembered ? 'remembered' : 'pending-review'
    cards = session.cards.map((card) => card.exercise.id === current.exercise.id
      ? { ...card, outcome }
      : card)
  } else {
    queue = [...queue, current.exercise.id]
  }

  return selectNextCard(session, cards, queue, finishedAt)
}

export function finishStudySession(session: StudySession, finishedAt?: string): StudySession {
  assertActive(session)
  const unfinishedIds = new Set(session.queue)
  const cards = session.cards.map((card) => unfinishedIds.has(card.exercise.id)
    ? { ...card, outcome: 'pending-review' as const }
    : card)
  return {
    ...session,
    status: 'completed',
    phase: 'completed',
    cards,
    queue: [],
    currentCardId: null,
    endedEarly: true,
    finishedAt: finishedAt ?? new Date().toISOString(),
  }
}

export function restartStudySession(
  previous: StudySession,
  flashcards: readonly FlashcardExercise[],
  sessionId: string,
  random?: RandomSource,
  startedAt?: string,
): StudySession {
  if (previous.status !== 'completed') throw new Error('Termina el estudio antes de reiniciarlo.')
  return createStudySession({
    sessionId,
    subjectId: previous.subjectId,
    topicId: previous.topicId,
    contentVersion: previous.contentVersion,
    configuration: previous.configuration,
    flashcards,
    random,
    startedAt,
  })
}

function selectNextCard(
  session: StudySession,
  cards: StudyCardProgress[],
  queue: string[],
  finishedAt?: string,
): StudySession {
  const nextId = queue[0]
  if (!nextId) {
    return {
      ...session,
      status: 'completed',
      phase: 'completed',
      cards,
      queue: [],
      currentCardId: null,
      finishedAt: finishedAt ?? new Date().toISOString(),
    }
  }

  let repetitionCount = session.repetitionCount
  const nextCards = cards.map((card) => {
    if (card.exercise.id !== nextId) return card
    if (card.presentations > 0) repetitionCount += 1
    return { ...card, presentations: card.presentations + 1 }
  })
  return {
    ...session,
    phase: 'front',
    cards: nextCards,
    queue,
    currentCardId: nextId,
    repetitionCount,
  }
}

function assertActive(session: StudySession): void {
  if (session.status !== 'active') throw new Error('El estudio ya ha terminado.')
}

function copyFlashcard(exercise: FlashcardExercise): FlashcardExercise {
  return {
    ...exercise,
    learningObjectiveIds: [...exercise.learningObjectiveIds],
    tags: [...exercise.tags],
    ...(exercise.hints ? { hints: [...exercise.hints] } : {}),
    ...(exercise.media ? { media: exercise.media.map((resource) => ({ ...resource })) } : {}),
  }
}
