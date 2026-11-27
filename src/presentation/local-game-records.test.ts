import { describe, expect, it } from 'vitest'
import type { GameResult } from '../domain/game'
import { createLocalGameRecordsStore } from './local-game-records'
import type { KeyValueStorage } from './question-history-storage'

const STORAGE_KEY = 'retonautas.game-records.v1'

class MemoryStorage implements KeyValueStorage {
  value: string | null = null

  getItem(key: string): string | null {
    return key === STORAGE_KEY ? this.value : null
  }

  setItem(key: string, value: string): void {
    if (key === STORAGE_KEY) this.value = value
  }
}

function result(sessionId: string, score: number, correctCount: number): GameResult {
  return {
    sessionId,
    subjectId: 'english',
    topicId: 'irregular-verbs',
    modeId: 'classic',
    durationKind: 'short',
    questionCount: 5,
    difficulty: 'beginner',
    configurationKey: '{"difficulty":"beginner","answerFormat":"selection"}',
    contentVersion: '1.0.0',
    scoringVersion: 'v1',
    score,
    correctCount,
    totalQuestions: 5,
    startedAt: '2026-09-24T10:00:00.000Z',
    finishedAt: '2026-09-24T10:05:00.000Z',
  }
}

describe('local game records', () => {
  it('stores the perfect badge and personal best once per session', () => {
    const storage = new MemoryStorage()
    const store = createLocalGameRecordsStore(() => storage)
    const perfect = result('session-perfect', 500, 5)

    expect(store.record(perfect)).toEqual({
      newPersonalRecord: true,
      personalBest: 500,
      perfectBadgeAwarded: true,
    })
    expect(store.record(perfect)).toEqual({
      newPersonalRecord: true,
      personalBest: 500,
      perfectBadgeAwarded: true,
    })

    const saved = JSON.parse(storage.value ?? '{}')
    expect(saved.perfectBadges).toEqual(['session-perfect'])
    expect(Object.keys(saved.processed)).toEqual(['session-perfect'])
  })

  it('announces new records only when the score improves and handles imperfect wins', () => {
    const storage = new MemoryStorage()
    const store = createLocalGameRecordsStore(() => storage)

    store.record(result('session-one', 500, 5))
    expect(store.record(result('session-two', 400, 4))).toEqual({
      newPersonalRecord: false,
      personalBest: 500,
      perfectBadgeAwarded: false,
    })
    expect(store.record(result('session-three', 600, 4))).toEqual({
      newPersonalRecord: true,
      personalBest: 600,
      perfectBadgeAwarded: false,
    })
  })

  it('falls back to memory when storage is corrupt or unavailable', () => {
    const storage = new MemoryStorage()
    storage.value = 'bad json'
    const corrupted = createLocalGameRecordsStore(() => storage)
    expect(corrupted.record(result('recovered', 300, 3)).personalBest).toBe(300)
    expect(JSON.parse(storage.value ?? '{}').processed.recovered).toBeDefined()

    const unavailable = createLocalGameRecordsStore(() => undefined)
    expect(unavailable.record(result('memory', 250, 3)).personalBest).toBe(250)
  })
})

describe('local collection', () => {
  it('migrates pre-collection progress and stores only unique opened treasures', () => {
    const storage = new MemoryStorage()
    storage.value = JSON.stringify({ version: 1, bestScores: {}, perfectBadges: ['older-perfect'], processed: {} })
    const store = createLocalGameRecordsStore(() => storage)
    expect(store.getCollection()).toEqual({ perfect: true, treasures: [] })
    store.recordTreasure('star-crystal')
    store.recordTreasure('star-crystal')
    const reloaded = createLocalGameRecordsStore(() => storage)
    expect(reloaded.getCollection()).toEqual({ perfect: true, treasures: ['star-crystal'] })
  })
})
