import { describe, expect, it } from 'vitest'
import { fisherYates } from './random'

describe('fisherYates', () => {
  it('es reproducible con una fuente inyectada', () => {
    const seededRandom = (seed: number) => () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    expect(fisherYates(['a', 'b', 'c', 'd'], seededRandom(42)))
      .toEqual(fisherYates(['a', 'b', 'c', 'd'], seededRandom(42)))
  })

  it('no muta el original y conserva todos los elementos', () => {
    const original = Object.freeze(['a', 'b', 'c', 'd'])
    const shuffled = fisherYates(original, () => 0)
    expect(original).toEqual(['a', 'b', 'c', 'd'])
    expect([...shuffled].sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('rechaza fuentes fuera del rango', () => {
    expect(() => fisherYates([1, 2, 3], () => 1)).toThrow()
  })
})
