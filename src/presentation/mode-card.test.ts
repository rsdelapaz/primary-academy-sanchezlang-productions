import { describe, expect, it } from 'vitest'
import { getGameMode } from '../domain/game-modes'
import { getModeCardPresentation } from './mode-card'

describe('mode card presentation', () => {
  it.each(['galaxy', 'pop-adventure'] as const)('uses the original approved art for %s', (theme) => {
    const classic = getGameMode('classic')
    const treasure = getGameMode('treasure')
    expect(classic).toBeDefined()
    expect(treasure).toBeDefined()
    if (!classic || !treasure) throw new Error('Expected current strategies')
    expect(getModeCardPresentation(classic, theme))
      .toEqual({ title: 'Relámpago', description: 'Suma puntos con tus aciertos.', artwork: `art/modes/${theme}-classic.webp` })
    expect(getModeCardPresentation(treasure, theme))
      .toEqual({ title: 'Tesoro', description: 'Gana llaves y abre cofres.', artwork: `art/modes/${theme}-treasure.webp` })
  })

  it.each(['future-mode', 'constructor', 'toString'])('supports a new mode without custom art: %s', (id) => {
    expect(getModeCardPresentation({ id, title: 'Exploración', description: 'Resuelve retos.' }, 'galaxy'))
      .toEqual({ title: 'Exploración', description: 'Resuelve retos.', artwork: null })
  })
})
