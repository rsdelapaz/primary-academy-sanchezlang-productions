import type { GameSession } from './game'
import type { TreasureModeState } from './game-modes'

export const TREASURE_CHESTS = [
  { id: 'star-crystal', costFifths: 1 },
  { id: 'golden-compass', costFifths: 2 },
  { id: 'moon-crown', costFifths: 3 },
] as const

export type TreasureId = (typeof TREASURE_CHESTS)[number]['id']

export function getTreasureCost(treasureId: TreasureId, questionCount: number): number {
  const chest = TREASURE_CHESTS.find(({ id }) => id === treasureId)
  if (!chest) throw new Error(`Cofre desconocido: ${treasureId}`)
  if (!Number.isSafeInteger(questionCount) || questionCount < 1) {
    throw new Error('La cantidad de preguntas debe ser un entero positivo.')
  }
  return Math.ceil((chest.costFifths * questionCount) / 5)
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
