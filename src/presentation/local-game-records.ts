import { getRankingKey, type GameResult } from '../domain/game'
import { type KeyValueStorage } from './question-history-storage'

const STORAGE_KEY = 'retonautas.game-records.v1'
const MAX_PROCESSED_SESSIONS = 200
const MAX_PERFECT_BADGES = 200

interface StoredGameRecord {
  score: number
  sessionId: string
  achievedAt: string
}

export interface GameAchievement {
  newPersonalRecord: boolean
  personalBest: number
  perfectBadgeAwarded: boolean
}

interface StoredProgress {
  version: 1
  bestScores: Record<string, StoredGameRecord>
  perfectBadges: string[]
  processed: Record<string, GameAchievement>
}

export interface LocalGameRecordsStore {
  record(result: GameResult): GameAchievement
}

export function createLocalGameRecordsStore(
  getStorage: () => KeyValueStorage | undefined = getBrowserStorage,
): LocalGameRecordsStore {
  let memoryProgress = emptyProgress()

  function record(result: GameResult): GameAchievement {
    const progress = readProgress()
    const existing = progress.processed[result.sessionId]
    if (existing) return existing

    const key = getRankingKey(result)
    const previousBest = progress.bestScores[key]
    const newPersonalRecord = !previousBest || result.score > previousBest.score
    const personalBest = newPersonalRecord ? result.score : previousBest.score
    const perfect = result.totalQuestions > 0 && result.correctCount === result.totalQuestions
    const outcome: GameAchievement = {
      newPersonalRecord,
      personalBest,
      perfectBadgeAwarded: perfect,
    }

    const next: StoredProgress = {
      ...progress,
      bestScores: newPersonalRecord
        ? {
          ...progress.bestScores,
          [key]: {
            score: result.score,
            sessionId: result.sessionId,
            achievedAt: result.finishedAt,
          },
        }
        : progress.bestScores,
      perfectBadges: perfect && !progress.perfectBadges.includes(result.sessionId)
        ? [...progress.perfectBadges, result.sessionId].slice(-MAX_PERFECT_BADGES)
        : progress.perfectBadges,
      processed: keepRecent({
        ...progress.processed,
        [result.sessionId]: outcome,
      }),
    }

    memoryProgress = next
    try {
      getStorage()?.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      return outcome
    }
    return outcome
  }

  function readProgress(): StoredProgress {
    try {
      const raw = getStorage()?.getItem(STORAGE_KEY)
      if (raw === null || raw === undefined) return memoryProgress
      memoryProgress = parseProgress(raw)
    } catch {
      return memoryProgress
    }
    return memoryProgress
  }

  return { record }
}

export const localGameRecordsStore = createLocalGameRecordsStore()

function parseProgress(raw: string): StoredProgress {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return emptyProgress()
  }
  if (!isRecord(value) || value.version !== 1 ||
    !isRecord(value.bestScores) || !Array.isArray(value.perfectBadges) ||
    !isRecord(value.processed)) return emptyProgress()

  const bestScores: Record<string, StoredGameRecord> = {}
  for (const [key, record] of Object.entries(value.bestScores)) {
    if (!isRecord(record) || typeof record.score !== 'number' ||
      typeof record.sessionId !== 'string' || typeof record.achievedAt !== 'string') continue
    bestScores[key] = {
      score: record.score,
      sessionId: record.sessionId,
      achievedAt: record.achievedAt,
    }
  }
  const processed: Record<string, GameAchievement> = {}
  for (const [id, achievement] of Object.entries(value.processed)) {
    if (!isRecord(achievement) || typeof achievement.newPersonalRecord !== 'boolean' ||
      typeof achievement.personalBest !== 'number' || typeof achievement.perfectBadgeAwarded !== 'boolean') continue
    processed[id] = {
      newPersonalRecord: achievement.newPersonalRecord,
      personalBest: achievement.personalBest,
      perfectBadgeAwarded: achievement.perfectBadgeAwarded,
    }
  }
  return {
    version: 1,
    bestScores,
    perfectBadges: value.perfectBadges.filter((id): id is string => typeof id === 'string'),
    processed,
  }
}

function keepRecent(entries: Record<string, GameAchievement>): Record<string, GameAchievement> {
  const recent = Object.entries(entries).slice(-MAX_PROCESSED_SESSIONS)
  return Object.fromEntries(recent)
}

function emptyProgress(): StoredProgress {
  return { version: 1, bestScores: {}, perfectBadges: [], processed: {} }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getBrowserStorage(): KeyValueStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}
