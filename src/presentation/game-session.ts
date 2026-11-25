import { shallowRef } from 'vue'
import { isSingleChoiceExercise, type ContentPackage, type SingleChoiceExercise } from '../domain/content'
import {
  abandonGame,
  advanceQuestion,
  answerQuestion,
  createGameSession,
  restartGame,
  type GameModeId,
  type GameConfiguration,
  type GameSession,
} from '../domain/game'
import { isGameModeCompatible } from '../domain/game-modes'
import { openTreasure as openTreasureInDomain, type TreasureId } from '../domain/treasure'

export const gameSession = shallowRef<GameSession | null>(null)

export function startGame(
  subjectId: string,
  topicId: string,
  content: ContentPackage,
  modeId: GameModeId,
  configuration: GameConfiguration,
): GameSession {
  const next = createGameSession({
    sessionId: crypto.randomUUID(),
    subjectId,
    topicId,
    contentVersion: content.contentVersion,
    modeId,
    configuration,
    exercises: content.exercises.filter((exercise): exercise is SingleChoiceExercise =>
      isSingleChoiceExercise(exercise) && isGameModeCompatible(modeId, exercise.type),
    ),
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

export function openActiveTreasure(treasureId: TreasureId): GameSession {
  if (!gameSession.value) throw new Error('No hay una sesión activa.')
  gameSession.value = openTreasureInDomain(gameSession.value, treasureId)
  return gameSession.value
}

export function restartActiveGame(exercises: readonly SingleChoiceExercise[]): GameSession {
  if (!gameSession.value) throw new Error('No hay una sesión anterior que reiniciar.')
  const next = restartGame(gameSession.value, exercises, crypto.randomUUID())
  gameSession.value = next
  return next
}
