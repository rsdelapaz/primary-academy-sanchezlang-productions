import { getRankingKey, type GameResult } from '../domain/game'
import { TREASURE_CHESTS, type TreasureId } from '../domain/treasure'
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
  treasures: TreasureId[]
}

export interface GameCollection {
  perfect: boolean
  treasures: readonly TreasureId[]
}

export interface LocalGameRecordsStore {
  record(result: GameResult): GameAchievement
  recordTreasure(treasureId: TreasureId): void
  getCollection(): GameCollection
}

export function createLocalGameRecordsStore(
  getStorage: () => KeyValueStorage | undefined = getBrowserStorage,
): LocalGameRecordsStore {
  let memoryProgress = emptyProgress()
  let storageWriteFailed = false

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

    saveProgress(next)
    return outcome
  }

  function saveProgress(next: StoredProgress): void {
    memoryProgress = next
    try {
      getStorage()?.setItem(STORAGE_KEY, JSON.stringify(next))
      storageWriteFailed = false
    } catch {
      storageWriteFailed = true
      // Sigue disponible durante esta sesión si no hay almacenamiento local.
    }
  }

  function recordTreasure(treasureId: TreasureId): void {
    const progress = readProgress()
    if (!TREASURE_CHESTS.some(({ id }) => id === treasureId) || progress.treasures.includes(treasureId)) return
    saveProgress({ ...progress, treasures: [...progress.treasures, treasureId] })
  }

  function getCollection(): GameCollection {
    const progress = readProgress()
    return {
      perfect: progress.perfectBadges.length > 0,
      treasures: [...progress.treasures],
    }
  }

  function readProgress(): StoredProgress {
    if (storageWriteFailed) return memoryProgress
    try {
      const raw = getStorage()?.getItem(STORAGE_KEY)
      if (raw === null || raw === undefined) return memoryProgress
      memoryProgress = parseProgress(raw)
    } catch {
      return memoryProgress
    }
    return memoryProgress
  }

  return { record, recordTreasure, getCollection }
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
  const storedTreasures = Array.isArray(value.treasures) ? value.treasures : []
  return {
    version: 1,
    bestScores,
    perfectBadges: value.perfectBadges.filter((id): id is string => typeof id === 'string'),
    processed,
    treasures: TREASURE_CHESTS.map(({ id }) => id)
      .filter((id) => storedTreasures.includes(id)),
  }
}

function keepRecent(entries: Record<string, GameAchievement>): Record<string, GameAchievement> {
  const recent = Object.entries(entries).slice(-MAX_PROCESSED_SESSIONS)
  return Object.fromEntries(recent)
}

function emptyProgress(): StoredProgress {
  return { version: 1, bestScores: {}, perfectBadges: [], processed: {}, treasures: [] }
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
