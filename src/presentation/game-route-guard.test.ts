import { describe, expect, it } from 'vitest'
import { advanceQuestion, answerQuestion, createGameSession } from '../domain/game'
import type { SingleChoiceExercise } from '../domain/content'
import { guardGameRoute } from './game-route-guard'

const exercise: SingleChoiceExercise = {
  id: 'route-exercise',
  type: 'single_choice',
  conceptId: 'route-concept',
  learningObjectiveIds: ['route-objective'],
  difficulty: 'beginner',
  tags: [],
  instructionLanguage: 'es',
  exerciseLanguage: 'es',
  explanationLanguage: 'es',
  prompt: 'Pregunta',
  explanation: 'Explicación',
  options: [{ id: 'route-option-a', text: 'A' }, { id: 'route-option-b', text: 'B' }],
  correctOptionId: 'route-option-a',
}

const request = {
  requiresActiveGame: false,
  requiresCompletedGame: true,
  subjectId: 'sample-subject',
  topicId: 'sample-topic',
  modeId: 'classic',
}

function activeGame() {
  return createGameSession({
    sessionId: 'route-session',
    subjectId: 'sample-subject',
    topicId: 'sample-topic',
    contentVersion: '1.0.0',
    modeId: 'classic',
    configuration: { duration: { kind: 'custom', questionCount: 1 }, difficulty: 'all' },
    exercises: [exercise],
    random: () => 0,
  })
}

describe('guardas de acceso a rutas de partida', () => {
  it('redirige accesos directos sin sesión y mantiene rutas públicas', () => {
    expect(guardGameRoute(request, null)).toEqual({ kind: 'redirect', name: 'home' })
    expect(guardGameRoute({ ...request, requiresCompletedGame: false, requiresActiveGame: false }, null))
      .toEqual({ kind: 'allow' })
  })

  it('redirige resultados hacia el juego hasta completar y los permite al finalizar', () => {
    const active = activeGame()
    expect(guardGameRoute(request, active)).toEqual({
      kind: 'redirect', name: 'play',
      params: { subjectId: 'sample-subject', topicId: 'sample-topic', modeId: 'classic' },
    })
    const answered = answerQuestion(active, exercise.id, {
      type: 'single_choice',
      optionId: exercise.correctOptionId,
    })
    const completed = advanceQuestion(answered, '2026-01-01T00:00:00.000Z')
    expect(guardGameRoute(request, completed)).toEqual({ kind: 'allow' })
  })

  it('rechaza rutas de otro tema o sesiones abandonadas', () => {
    expect(guardGameRoute({ ...request, topicId: 'other-topic' }, activeGame()))
      .toEqual({ kind: 'redirect', name: 'home' })
    const abandoned = { ...activeGame(), status: 'abandoned' as const }
    expect(guardGameRoute(request, abandoned)).toEqual({ kind: 'redirect', name: 'home' })
  })
})
