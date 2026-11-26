import { getLocalDayKey, type QuestionHistory } from '../application/question-selection'

const STORAGE_KEY = 'retonautas.question-history.v1'

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface StoredHistory {
  version: 1
  entries: QuestionHistory
}

export interface QuestionHistoryStore {
  read(): QuestionHistory
  recordShown(key: string, at?: Date): QuestionHistory
}

export function createQuestionHistoryStore(
  getStorage: () => KeyValueStorage | undefined = getBrowserStorage,
): QuestionHistoryStore {
  let memoryHistory: QuestionHistory = {}

  function read(): QuestionHistory {
    try {
      const raw = getStorage()?.getItem(STORAGE_KEY)
      if (raw === null || raw === undefined) return memoryHistory
      const parsed = parseHistory(raw)
      memoryHistory = parsed
      return memoryHistory
    } catch {
      return memoryHistory
    }
  }

  function recordShown(key: string, at = new Date()): QuestionHistory {
    const updated: StoredHistory = {
      version: 1,
      entries: {
        ...read(),
        [key]: {
          day: getLocalDayKey(at),
          lastShownAt: at.toISOString(),
        },
      },
    }
    memoryHistory = updated.entries
    try {
      getStorage()?.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      return memoryHistory
    }
    return memoryHistory
  }

  return { read, recordShown }
}

export const questionHistoryStore = createQuestionHistoryStore()

function parseHistory(raw: string): QuestionHistory {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.entries)) return {}

  const entries: Record<string, { day: string; lastShownAt: string }> = {}
  for (const [key, entry] of Object.entries(value.entries)) {
    if (!isRecord(entry) || typeof entry.day !== 'string' ||
      typeof entry.lastShownAt !== 'string' || Number.isNaN(Date.parse(entry.lastShownAt))) continue
    entries[key] = { day: entry.day, lastShownAt: entry.lastShownAt }
  }
  return entries
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

