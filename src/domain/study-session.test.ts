import { describe, expect, it } from 'vitest'
import type { FlashcardExercise } from './content'
import {
  createStudySession,
  finishStudySession,
  getCurrentStudyCard,
  getStudyStats,
  rateStudyCard,
  restartStudySession,
  revealStudyCard,
} from './study-session'

const flashcards: FlashcardExercise[] = Array.from({ length: 4 }, (_, index) => ({
  id: `study-card-${index + 1}`,
  type: 'flashcard',
  conceptId: 'technical-concept',
  learningObjectiveIds: ['technical-objective'],
  difficulty: index < 3 ? 'beginner' : 'intermediate',
  tags: [],
  instructionLanguage: 'es',
  exerciseLanguage: 'en',
  explanationLanguage: 'es',
  prompt: `Fixture ${index + 1}`,
  explanation: 'Technical fixture only.',
  front: `Front ${index + 1}`,
  back: `Back ${index + 1}`,
}))

function createStudy(questionCount = 3, random = () => 0) {
  return createStudySession({
    sessionId: `study-session-${questionCount}`,
    subjectId: 'technical-subject',
    topicId: 'technical-topic',
    contentVersion: '1.0.0',
    configuration: { duration: { kind: 'custom', questionCount }, difficulty: 'all' },
    flashcards,
    random,
    startedAt: '2026-01-01T00:00:00.000Z',
  })
}

function revealAndRate(session: ReturnType<typeof createStudy>, remembered: boolean) {
  return rateStudyCard(revealStudyCard(session), remembered, '2026-01-01T00:01:00.000Z')
}

describe('sesiones de autoestudio', () => {
  it('mezcla una selección sin reemplazo, de forma reproducible y sin mutar el banco', () => {
    const snapshot = JSON.stringify(flashcards)
    const first = createStudy(3, () => 0.37)
    const second = createStudy(3, () => 0.37)
    const ids = first.cards.map(({ exercise }) => exercise.id)

    expect(ids).toEqual(second.cards.map(({ exercise }) => exercise.id))
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    expect(JSON.stringify(flashcards)).toBe(snapshot)
    expect(first).not.toHaveProperty('score')
    expect(first).not.toHaveProperty('result')
  })

  it('filtra por dificultad antes de validar la duración seleccionada', () => {
    const session = createStudySession({
      sessionId: 'filtered-study',
      subjectId: 'technical-subject',
      topicId: 'technical-topic',
      contentVersion: '1.0.0',
      configuration: { duration: { kind: 'custom', questionCount: 3 }, difficulty: 'beginner' },
      flashcards,
      random: () => 0,
    })
    expect(session.cards).toHaveLength(3)
    expect(session.cards.every(({ exercise }) => exercise.difficulty === 'beginner')).toBe(true)
    expect(() => createStudySession({
      sessionId: 'too-many-filtered-cards',
      subjectId: 'technical-subject',
      topicId: 'technical-topic',
      contentVersion: '1.0.0',
      configuration: { duration: { kind: 'custom', questionCount: 4 }, difficulty: 'beginner' },
      flashcards,
    })).toThrow(/tarjetas compatibles disponibles/)
  })

  it('solo permite autoevaluar tras revelar y termina al recordar todas las tarjetas', () => {
    const initial = createStudy(1)
    expect(() => rateStudyCard(initial, true)).toThrow(/Revela la respuesta/)

    const revealed = revealStudyCard(initial)
    expect(revealed.phase).toBe('back')
    expect(getCurrentStudyCard(revealed)?.exercise.back).toBeTruthy()
    const completed = rateStudyCard(revealed, true, '2026-01-01T00:02:00.000Z')

    expect(completed.status).toBe('completed')
    expect(completed.cards[0].outcome).toBe('remembered')
    expect(getStudyStats(completed)).toMatchObject({
      rememberedCount: 1,
      pendingCount: 0,
      repetitionCount: 0,
      progressPercent: 100,
    })
  })

  it('reincorpora al final las no recordadas y las deja pendientes tras tres presentaciones', () => {
    let session = createStudy(2)
    const firstId = getCurrentStudyCard(session)!.exercise.id
    const remainingId = session.queue[1]

    session = revealAndRate(session, false)
    expect(getCurrentStudyCard(session)?.exercise.id).toBe(remainingId)
    session = revealAndRate(session, true)
    expect(getCurrentStudyCard(session)?.exercise.id).toBe(firstId)
    expect(getCurrentStudyCard(session)?.presentations).toBe(2)
    expect(session.repetitionCount).toBe(1)

    session = revealAndRate(session, false)
    expect(getCurrentStudyCard(session)?.presentations).toBe(3)
    session = revealAndRate(session, false)
    expect(session.status).toBe('completed')
    expect(session.cards.find(({ exercise }) => exercise.id === firstId)?.outcome).toBe('pending-review')
    expect(getStudyStats(session)).toMatchObject({ rememberedCount: 1, pendingCount: 1, repetitionCount: 2 })
  })

  it('permite finalizar antes y reiniciar con la configuración y una sesión nueva', () => {
    const initial = createStudy(3)
    const completed = finishStudySession(initial, '2026-01-01T00:03:00.000Z')
    expect(completed.endedEarly).toBe(true)
    expect(getStudyStats(completed)).toMatchObject({
      rememberedCount: 0,
      pendingCount: 3,
      completedCount: 3,
      progressPercent: 100,
    })
    expect(() => revealStudyCard(completed)).toThrow(/ya ha terminado/)

    let randomCalls = 0
    const restarted = restartStudySession(completed, flashcards, 'study-restarted', () => {
      randomCalls += 1
      return 0.6
    })
    expect(randomCalls).toBeGreaterThan(0)
    expect(restarted.id).toBe('study-restarted')
    expect(restarted.configuration).toEqual(initial.configuration)
    expect(restarted.status).toBe('active')
    expect(restarted.cards.every(({ outcome, presentations }) => outcome === null && presentations <= 1)).toBe(true)
    expect(restarted.repetitionCount).toBe(0)
  })

  it('rechaza duración fuera del banco, IDs duplicados y aleatoriedad inválida', () => {
    expect(() => createStudy(5)).toThrow(/compatibles disponibles/)
    expect(() => createStudySession({
      sessionId: 'duplicate-cards',
      subjectId: 'technical-subject',
      topicId: 'technical-topic',
      contentVersion: '1.0.0',
      configuration: { duration: { kind: 'custom', questionCount: 2 }, difficulty: 'all' },
      flashcards: [flashcards[0], flashcards[0]],
    })).toThrow(/duplicados/)
    expect(() => createStudy(2, () => 1)).toThrow(/Random source/)
  })
})
