export type AutoAdvanceStatus = 'idle' | 'running' | 'paused' | 'manual' | 'finished'

export interface AutoAdvanceInput {
  feedbackKey: string | null
  enabled: boolean
  blocked: boolean
  delayMs: 3000 | 8000
}

export interface AutoAdvanceState {
  status: AutoAdvanceStatus
  feedbackKey: string | null
  remainingMs: number
  remainingSeconds: number
}

export interface AutoAdvanceController {
  update(input: AutoAdvanceInput): void
  cancel(): void
  dispose(): void
  getState(): AutoAdvanceState
}

interface AutoAdvanceCallbacks {
  onAdvance: (feedbackKey: string) => void
  onTick: (state: AutoAdvanceState) => void
}

/**
 * A single countdown per active feedback key. Repeated updates for the same
 * key preserve elapsed time; only a different key starts a new countdown.
 * The caller owns blocking conditions and must dispose when it unmounts.
 */
export function createAutoAdvance(
  { onAdvance, onTick }: AutoAdvanceCallbacks,
): AutoAdvanceController {
  let feedbackKey: string | null = null
  let status: AutoAdvanceStatus = 'idle'
  let remainingMs = 0
  let deadline = 0
  let timeout: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let disposed = false

  function getState(): AutoAdvanceState {
    const remaining = status === 'running' ? Math.max(0, deadline - performance.now()) : remainingMs
    return {
      feedbackKey,
      status,
      remainingMs: remaining,
      remainingSeconds: Math.ceil(remaining / 1000),
    }
  }

  function clearTimer(): void {
    // Invalidate callbacks even if a cleared timeout has already been queued.
    generation++
    if (timeout !== undefined) {
      clearTimeout(timeout)
      timeout = undefined
    }
  }

  function schedule(): void {
    const { remainingMs: remaining, remainingSeconds } = getState()
    // Wake up only at the next displayed second transition (or deadline).
    const waitMs = Math.max(0, remaining - (remainingSeconds - 1) * 1000)
    const token = generation
    timeout = setTimeout(() => {
      if (disposed || token !== generation || status !== 'running' || feedbackKey === null) return
      timeout = undefined

      if (getState().remainingMs > 0) {
        schedule()
        onTick(getState())
        return
      }

      const completedKey = feedbackKey
      status = 'finished'
      remainingMs = 0
      onTick(getState())
      // A consumer may synchronously cancel, dispose or replace this feedback.
      if (!disposed && token === generation && feedbackKey === completedKey) {
        onAdvance(completedKey)
      }
    }, remaining === 0 ? 0 : Math.ceil(waitMs))
  }

  function update(input: AutoAdvanceInput): void {
    if (disposed) return
    const newFeedback = feedbackKey !== input.feedbackKey
    const nextStatus: AutoAdvanceStatus = input.feedbackKey === null
      ? 'idle'
      : !input.enabled ? 'manual' : input.blocked ? 'paused' : 'running'

    // A consumed key must never be re-armed by a subsequent watcher update.
    if (!newFeedback && (status === 'finished' || status === nextStatus)) return

    remainingMs = getState().remainingMs
    clearTimer()
    feedbackKey = input.feedbackKey
    if (newFeedback) remainingMs = input.feedbackKey === null ? 0 : input.delayMs

    status = nextStatus
    if (status === 'running') {
      deadline = performance.now() + remainingMs
      schedule()
    }
    onTick(getState())
  }

  function cancel(): void {
    if (disposed || feedbackKey === null) return
    clearTimer()
    if (status === 'finished') return
    status = 'finished'
    remainingMs = 0
    onTick(getState())
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    clearTimer()
    feedbackKey = null
    status = 'idle'
    remainingMs = 0
  }

  return { update, cancel, dispose, getState }
}
