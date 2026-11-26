import type { GameSession } from '../domain/game'

export interface GameRouteRequest {
  requiresActiveGame: boolean
  requiresCompletedGame: boolean
  subjectId?: string
  topicId?: string
  modeId?: string
}

export type GameRouteDecision =
  | { kind: 'allow' }
  | { kind: 'redirect'; name: 'home' | 'play' | 'results'; params?: Record<string, string> }

export function guardGameRoute(request: GameRouteRequest, game: GameSession | null): GameRouteDecision {
  if (!request.requiresActiveGame && !request.requiresCompletedGame) return { kind: 'allow' }
  if (!game) return { kind: 'redirect', name: 'home' }

  const matches = request.subjectId === game.subjectId &&
    request.topicId === game.topicId &&
    request.modeId === game.modeId
  if (!matches) return { kind: 'redirect', name: 'home' }

  const params = { subjectId: game.subjectId, topicId: game.topicId, modeId: game.modeId }
  if (request.requiresActiveGame && game.status !== 'active') {
    return game.status === 'completed'
      ? { kind: 'redirect', name: 'results', params }
      : { kind: 'redirect', name: 'home' }
  }
  if (request.requiresCompletedGame && game.status !== 'completed') {
    return game.status === 'active'
      ? { kind: 'redirect', name: 'play', params }
      : { kind: 'redirect', name: 'home' }
  }
  return { kind: 'allow' }
}
