import { ref, shallowRef } from 'vue'
import { isGameExercise, type ContentPackage, type GameExercise } from '../domain/content'
import {
  abandonGame,
  advanceQuestion,
  answerQuestion,
  createGameSession,
  restartGame,
  type GameModeId,
  type GameConfiguration,
  type GameAnswerResponse,
  type GameSession,
} from '../domain/game'
import { isGameModeCompatible } from '../domain/game-modes'
import { openTreasure as openTreasureInDomain, type TreasureId } from '../domain/treasure'
import { selectGameQuestions } from '../application/question-selection'
import { questionHistoryStore } from './question-history-storage'

export const gameSession = shallowRef<GameSession | null>(null)
// Playback is a presentation preference, not part of scoring or ranking.
export const gameAutoAdvanceEnabled = ref(false)

export function startGame(
  subjectId: string,
  topicId: string,
  content: ContentPackage,
  modeId: GameModeId,
  configuration: GameConfiguration,
  playback: { autoAdvance: boolean } = { autoAdvance: false },
): GameSession {
  const compatibleExercises = content.exercises.filter((exercise): exercise is GameExercise =>
    isGameExercise(exercise) && isGameModeCompatible(modeId, exercise.type),
  )
  const selectedExercises = selectGameQuestions({
    subjectId,
    topicId,
    modeId,
    configuration,
    exercises: compatibleExercises,
    history: questionHistoryStore.read(),
  })
  const next = createGameSession({
    sessionId: crypto.randomUUID(),
    subjectId,
    topicId,
    contentVersion: content.contentVersion,
    modeId,
    configuration,
    exercises: selectedExercises,
  })
  gameAutoAdvanceEnabled.value = playback.autoAdvance
  gameSession.value = next
  return next
}

export function answerActiveQuestion(exerciseId: string, response: GameAnswerResponse): GameSession {
  if (!gameSession.value) throw new Error('No hay una sesión activa.')
  gameSession.value = answerQuestion(gameSession.value, exerciseId, response)
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

export function restartActiveGame(exercises: readonly GameExercise[]): GameSession {
  if (!gameSession.value) throw new Error('No hay una sesión anterior que reiniciar.')
  const previous = gameSession.value
  const selectedExercises = selectGameQuestions({
    subjectId: previous.subjectId,
    topicId: previous.topicId,
    modeId: previous.modeId,
    configuration: previous.configuration,
    exercises,
    history: questionHistoryStore.read(),
  })
  const next = restartGame(previous, selectedExercises, crypto.randomUUID())
  gameSession.value = next
  return next
}
