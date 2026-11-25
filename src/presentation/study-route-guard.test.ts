import { describe, expect, it } from 'vitest'
import type { FlashcardExercise } from '../domain/content'
import { createStudySession, finishStudySession } from '../domain/study-session'
import { guardStudyRoute } from './study-route-guard'

const card: FlashcardExercise = {
  id: 'route-study-card',
  type: 'flashcard',
  conceptId: 'route-concept',
  learningObjectiveIds: ['route-objective'],
  difficulty: 'beginner',
  tags: [],
  instructionLanguage: 'es',
  exerciseLanguage: 'en',
  explanationLanguage: 'es',
  prompt: 'Technical fixture',
  explanation: 'Technical fixture only.',
  front: 'front',
  back: 'back',
}

const request = {
  requiresStudySession: true,
  subjectId: 'sample-subject',
  topicId: 'sample-topic',
}

function session() {
  return createStudySession({
    sessionId: 'study-route-session',
    subjectId: 'sample-subject',
    topicId: 'sample-topic',
    contentVersion: '1.0.0',
    configuration: { duration: { kind: 'custom', questionCount: 1 }, difficulty: 'all' },
    flashcards: [card],
    random: () => 0,
  })
}

describe('guardas de rutas de autoestudio', () => {
  it('protege estudio directo y permite la ruta al tener sesión coincidente', () => {
    expect(guardStudyRoute(request, null)).toEqual({ kind: 'redirect', name: 'home' })
    expect(guardStudyRoute(request, session())).toEqual({ kind: 'allow' })
    expect(guardStudyRoute({ ...request, topicId: 'other-topic' }, session()))
      .toEqual({ kind: 'redirect', name: 'home' })
  })

  it('mantiene disponible la vista final de una sesión completada', () => {
    expect(guardStudyRoute(request, finishStudySession(session()))).toEqual({ kind: 'allow' })
  })
})
