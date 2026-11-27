import type { GameModeDefinition, GameModeId } from '../domain/game-modes'
import type { ThemeId } from './theme-preference'

interface ModeCardCopy {
  title: string
  description: string
  artwork: Record<ThemeId, string>
}

// Visual/editorial metadata belongs in presentation, not the game strategy.
// A new strategy is immediately selectable with its own domain title and
// description; bespoke artwork is optional and can be supplied independently.
const cards: Partial<Record<GameModeId, ModeCardCopy>> = {
  classic: {
    title: 'Relámpago',
    description: 'Suma puntos con tus aciertos.',
    artwork: {
      galaxy: 'art/modes/galaxy-classic.webp',
      'pop-adventure': 'art/modes/pop-adventure-classic.webp',
    },
  },
  treasure: {
    title: 'Tesoro',
    description: 'Gana llaves y abre cofres.',
    artwork: {
      galaxy: 'art/modes/galaxy-treasure.webp',
      'pop-adventure': 'art/modes/pop-adventure-treasure.webp',
    },
  },
}

export function getModeCardPresentation(
  mode: Pick<GameModeDefinition, 'title' | 'description'> & { id: string },
  theme: ThemeId,
): { title: string; description: string; artwork: string | null } {
  // Guard object membership to avoid treating e.g. "constructor" as metadata.
  const copy = Object.hasOwn(cards, mode.id) ? cards[mode.id as GameModeId] : undefined
  return {
    title: copy?.title ?? mode.title,
    description: copy?.description ?? mode.description,
    artwork: copy?.artwork[theme] ?? null,
  }
}
