import { describe, expect, it } from 'vitest'
import { getSubjectArtwork } from './subject-card'

describe('subject card artwork', () => {
  it.each(['galaxy', 'pop-adventure'] as const)('assigns independent visuals in %s', (theme) => {
    expect(getSubjectArtwork('english', theme)).toBe(`art/subjects/${theme}-english.webp`)
    expect(getSubjectArtwork('mathematics', theme)).toBe(`art/subjects/${theme}-mathematics.webp`)
  })

  it.each(['language', 'science', 'constructor', 'toString'])('supports future catalog subject %s without additional artwork', (id) => {
    expect(getSubjectArtwork(id, 'galaxy')).toBeNull()
  })
})
