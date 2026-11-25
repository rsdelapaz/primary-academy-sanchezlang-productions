import type { ExerciseType } from './content'
import type { AnswerEvaluation } from './exercise-engine'
import type { TreasureId } from './treasure'

export interface ClassicModeState {
  modeId: 'classic'
}

export interface TreasureModeState {
  modeId: 'treasure'
  keysAvailable: number
  openedTreasures: TreasureId[]
}

export interface GameModeStates {
  classic: ClassicModeState
  treasure: TreasureModeState
}

export type GameModeId = keyof GameModeStates
export type GameModeState = GameModeStates[GameModeId]

export interface GameModeDefinition<Id extends GameModeId = GameModeId> {
  id: Id
  title: string
  description: string
  illustration: 'lightning' | 'treasure'
  quickPlayDefault: boolean
  compatibleExerciseTypes: readonly ExerciseType[]
}

interface GameModeStrategy<State extends GameModeState> {
  definition: GameModeDefinition<State['modeId']>
  createState: () => State
  applyAnswer: (state: State, evaluation: AnswerEvaluation) => State
}

const strategies: { [Id in GameModeId]: GameModeStrategy<GameModeStates[Id]> } = {
  classic: {
    definition: {
      id: 'classic',
      title: 'Reto Relámpago',
      description: 'Responde, suma puntos y aprende con cada reto.',
      illustration: 'lightning',
      quickPlayDefault: true,
      compatibleExerciseTypes: ['single_choice', 'typed_answer'],
    },
    createState: () => ({ modeId: 'classic' }),
    applyAnswer: (state) => state,
  },
  treasure: {
    definition: {
      id: 'treasure',
      title: 'Misión del Tesoro',
      description: 'Gana llaves con tus aciertos y elige qué cofres abrir.',
      illustration: 'treasure',
      quickPlayDefault: false,
      compatibleExerciseTypes: ['single_choice', 'typed_answer'],
    },
    createState: () => ({ modeId: 'treasure', keysAvailable: 0, openedTreasures: [] }),
    applyAnswer: (state, evaluation) => evaluation.correct
      ? { ...state, keysAvailable: state.keysAvailable + 1 }
      : state,
  },
}

export const GAME_MODES: readonly GameModeDefinition[] = Object.values(strategies)
  .map(({ definition }) => definition)

export function getGameMode(modeId: string): GameModeDefinition | undefined {
  return GAME_MODES.find((mode) => mode.id === modeId)
}

export function getDefaultGameModeId(): GameModeId {
  const defaultModes = GAME_MODES.filter(({ quickPlayDefault }) => quickPlayDefault)
  const defaultMode = defaultModes[0]
  if (defaultModes.length !== 1 || !defaultMode) {
    throw new Error('Debe existir una modalidad recomendada para la partida rápida.')
  }
  return defaultMode.id
}

export function isGameModeCompatible(modeId: string, exerciseType: ExerciseType): boolean {
  return getGameMode(modeId)?.compatibleExerciseTypes.includes(exerciseType) ?? false
}

export function createModeState(modeId: GameModeId): GameModeState {
  return strategies[modeId].createState()
}

export function applyModeAnswer(state: GameModeState, evaluation: AnswerEvaluation): GameModeState {
  switch (state.modeId) {
    case 'classic':
      return strategies.classic.applyAnswer(state, evaluation)
    case 'treasure':
      return strategies.treasure.applyAnswer(state, evaluation)
  }
}
