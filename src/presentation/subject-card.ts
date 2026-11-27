import type { ThemeId } from './theme-preference'

// Subject identity is independent of the content engine and the visual world.
// Every new catalog subject is selectable without adding art or editing HomeView.
const subjectArtwork: Readonly<Partial<Record<string, Record<ThemeId, string>>>> = {
  english: {
    galaxy: 'art/subjects/galaxy-english.webp',
    'pop-adventure': 'art/subjects/pop-adventure-english.webp',
  },
  mathematics: {
    galaxy: 'art/subjects/galaxy-mathematics.webp',
    'pop-adventure': 'art/subjects/pop-adventure-mathematics.webp',
  },
}

export function getSubjectArtwork(subjectId: string, theme: ThemeId): string | null {
  return Object.hasOwn(subjectArtwork, subjectId)
    ? subjectArtwork[subjectId]?.[theme] ?? null
    : null
}
