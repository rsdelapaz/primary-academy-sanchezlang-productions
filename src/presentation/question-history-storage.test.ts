import { describe, expect, it } from 'vitest'
import { createQuestionHistoryStore, type KeyValueStorage } from './question-history-storage'

const STORAGE_KEY = 'retonautas.question-history.v1'

class MemoryStorage implements KeyValueStorage {
  value: string | null = null

  getItem(key: string): string | null {
    return key === STORAGE_KEY ? this.value : null
  }

  setItem(key: string, value: string): void {
    if (key === STORAGE_KEY) this.value = value
  }
}

describe('question history storage', () => {
  it('records each displayed exercise with its local day and timestamp', () => {
    const storage = new MemoryStorage()
    const store = createQuestionHistoryStore(() => storage)
    const shownAt = new Date(2026, 8, 24, 9, 15)

    const history = store.recordShown('english:go:infinitive-to-past', shownAt)

    expect(history['english:go:infinitive-to-past']).toEqual({
      day: '2026-09-24',
      lastShownAt: shownAt.toISOString(),
    })
    expect(JSON.parse(storage.value ?? '{}').version).toBe(1)
  })

  it('recovers from corrupt storage and overwrites it on the next display', () => {
    const storage = new MemoryStorage()
    storage.value = '{corrupt'
    const store = createQuestionHistoryStore(() => storage)

    expect(store.read()).toEqual({})
    store.recordShown('exercise', new Date(2026, 8, 24, 10))
    expect(JSON.parse(storage.value ?? '{}').entries.exercise).toBeDefined()
  })

  it('continues in memory when browser storage is unavailable or throws', () => {
    const unavailable = createQuestionHistoryStore(() => undefined)
    unavailable.recordShown('memory-only', new Date(2026, 8, 24, 10))
    expect(unavailable.read()['memory-only']).toBeDefined()

    const blocked = createQuestionHistoryStore(() => ({
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    }))
    blocked.recordShown('blocked-storage', new Date(2026, 8, 24, 10))
    expect(blocked.read()['blocked-storage']).toBeDefined()
  })
})
