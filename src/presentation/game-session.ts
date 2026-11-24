import { shallowRef } from 'vue'
import type { ContentPackage, SingleChoiceExercise } from '../domain/content'
import {
  abandonGame,
  advanceQuestion,
  answerQuestion,
  createGameSession,
  restartGame,
  type GameConfiguration,
  type GameSession,
} from '../domain/game'

export const gameSession = shallowRef<GameSession | null>(null)

export function startGame(
  subjectId: string,
  topicId: string,
  content: ContentPackage,
  configuration: GameConfiguration,
): GameSession {
  const next = createGameSession({
    sessionId: crypto.randomUUID(),
    subjectId,
    topicId,
    contentVersion: content.contentVersion,
    modeId: 'classic',
    configuration,
    exercises: content.exercises,
  })
  gameSession.value = next
  return next
}

export function answerActiveQuestion(exerciseId: string, optionId: string): GameSession {
  if (!gameSession.value) throw new Error('No hay una sesión activa.')
  gameSession.value = answerQuestion(gameSession.value, exerciseId, optionId)
  return gameSession.value
}

export function advanceActiveQuestion(): GameSession {
  if (!gameSession.value) throw new Error('No hay una sesión activa.')
  gameSession.value = advanceQuestion(gameSession.value)
  return gameSession.value
}

export function abandonActiveGame(): GameSession {
  if (!gameSession.value) throw new Error('No hay una sesión activa.')
  gameSession.value = abandonGame(gameSession.value)
  return gameSession.value
}

export function restartActiveGame(exercises: readonly SingleChoiceExercise[]): GameSession {
  if (!gameSession.value) throw new Error('No hay una sesión anterior que reiniciar.')
  gameSession.value = restartGame(gameSession.value, exercises, crypto.randomUUID())
  return gameSession.value
}
