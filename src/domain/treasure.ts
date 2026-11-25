import type { GameSession } from './game'
import type { TreasureModeState } from './game-modes'

export const TREASURE_CHESTS = [
  { id: 'star-crystal' },
  { id: 'golden-compass' },
  { id: 'moon-crown' },
] as const

export type TreasureId = (typeof TREASURE_CHESTS)[number]['id']

export function getTreasureCost(treasureId: TreasureId, questionCount: number): number {
  const chestIndex = TREASURE_CHESTS.findIndex(({ id }) => id === treasureId)
  if (chestIndex < 0) throw new Error(`Cofre desconocido: ${treasureId}`)
  if (!Number.isSafeInteger(questionCount) || questionCount < 1) {
    throw new Error('La cantidad de preguntas debe ser un entero positivo.')
  }
  if (questionCount < TREASURE_CHESTS.length) {
    if (chestIndex >= questionCount) throw new Error('Este cofre no está disponible para esta duración.')
    return 1
  }

  const firstCost = Math.ceil(questionCount / 5)
  const secondCost = Math.ceil((questionCount * 3) / 10)
  if (chestIndex === 0) return firstCost
  if (chestIndex === 1) return secondCost
  return questionCount - firstCost - secondCost
}

export function openTreasure(session: GameSession, treasureId: TreasureId): GameSession {
  const modeState = session.modeState
  if (modeState.modeId !== 'treasure') throw new Error('Esta partida no tiene cofres del tesoro.')
  if (session.status !== 'completed' && !(session.status === 'active' && session.phase === 'feedback')) {
    throw new Error('Solo puedes abrir cofres después de responder o terminar la partida.')
  }
  if (modeState.openedTreasures.includes(treasureId)) throw new Error('Este cofre ya fue abierto.')

  const cost = getTreasureCost(treasureId, session.questions.length)
  if (modeState.keysAvailable < cost) throw new Error('No tienes llaves suficientes para este cofre.')

  const nextModeState: TreasureModeState = {
    ...modeState,
    keysAvailable: modeState.keysAvailable - cost,
    openedTreasures: [...modeState.openedTreasures, treasureId],
  }
  return { ...session, modeState: nextModeState }
}
