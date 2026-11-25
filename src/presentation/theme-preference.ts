import { ref } from 'vue'

export const THEMES = [
  {
    id: 'pop-adventure',
    name: 'Pop Adventure',
    icon: '🦄',
    description: 'Fantasía, música y amistad',
    motifs: ['✦', '♡', '♪'],
    swatches: ['#FDF2FA', '#803AB4', '#C04485', '#56D8C1', '#FFD77D'],
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    icon: '🚀',
    description: 'Exploración, espacio y arcade',
    motifs: ['✦', '◉', '⚡'],
    swatches: ['#101C35', '#1F3353', '#62DBFF', '#A3E66B', '#FF9F43'],
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

const DEFAULT_THEME: ThemeId = 'pop-adventure'
const STORAGE_KEY = 'retonautas.visual-theme'
const activeTheme = ref<ThemeId>(DEFAULT_THEME)
const stylesheets = import.meta.glob('../themes/*.css')
const loadedStyles = new Set<ThemeId>()

function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

async function loadStylesheet(themeId: ThemeId): Promise<void> {
  if (loadedStyles.has(themeId)) return
  const load = stylesheets[`../themes/${themeId}.css`]
  if (!load) throw new Error(`Falta la hoja de estilos del tema ${themeId}.`)
  await load()
  loadedStyles.add(themeId)
}

function readPreference(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function savePreference(themeId: ThemeId): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, themeId)
  } catch {
    // La preferencia queda aplicada en memoria si el navegador bloquea el almacenamiento.
  }
}

export async function initializeTheme(): Promise<void> {
  const preference = readPreference()
  let selectedTheme = isThemeId(preference) ? preference : DEFAULT_THEME
  try {
    await loadStylesheet(selectedTheme)
  } catch (error) {
    if (selectedTheme === DEFAULT_THEME) throw error
    selectedTheme = DEFAULT_THEME
    await loadStylesheet(selectedTheme)
  }
  activeTheme.value = selectedTheme
}

export async function selectTheme(themeId: ThemeId): Promise<void> {
  await loadStylesheet(themeId)
  activeTheme.value = themeId
  savePreference(themeId)
}

export function useThemePreference() {
  return { activeTheme, themes: THEMES, selectTheme }
}
