import { describe, expect, it } from 'vitest'
import { promptSegments } from './prompt-presentation'

describe('prompt presentation', () => {
  it.each([
    'What is the infinitive of “chosen”?',
    'Choose "saw" and not "seen".',
    '¿Cuánto es 7 × 8?',
    'Unclosed “quote and <strong>literal</strong>',
    'Don\'t replace apostrophes.',
  ])('preserves every character: %s', (prompt) => {
    expect(promptSegments(prompt).map(({ text }) => text).join('')).toBe(prompt)
  })
  it('emphasizes only complete quoted fragments', () => {
    expect(promptSegments('What is the infinitive of “chosen”?')).toEqual([
      { text: 'What is the infinitive of ', emphasized: false },
      { text: '“chosen”', emphasized: true },
      { text: '?', emphasized: false },
    ])
    expect(promptSegments('“unclosed')).toEqual([{ text: '“unclosed', emphasized: false }])
  })
})
