import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAutoAdvance,
  type AutoAdvanceInput,
  type AutoAdvanceState,
} from './auto-advance'

const defaultInput: AutoAdvanceInput = {
  feedbackKey: 'session-1:question-1',
  enabled: true,
  blocked: false,
  delayMs: 3000,
}

function setup() {
  const ticks: AutoAdvanceState[] = []
  const onAdvance = vi.fn()
  const controller = createAutoAdvance({
    onAdvance,
    onTick: (state) => ticks.push(state),
  })
  return {
    ...controller,
    ticks,
    onAdvance,
    update: (overrides: Partial<AutoAdvanceInput> = {}) =>
      controller.update({ ...defaultInput, ...overrides }),
  }
}

describe('automatic feedback advance', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it.each([3000, 8000] as const)('advances exactly once after %i ms', (delayMs) => {
    const controller = setup()
    controller.update({ delayMs })
    expect(controller.getState()).toMatchObject({
      status: 'running',
      remainingMs: delayMs,
      remainingSeconds: delayMs / 1000,
    })

    vi.advanceTimersByTime(delayMs - 1)
    expect(controller.onAdvance).not.toHaveBeenCalled()
    expect(controller.getState().remainingSeconds).toBe(1)
    vi.advanceTimersByTime(1)
    expect(controller.getState()).toMatchObject({ status: 'finished', remainingSeconds: 0 })
    expect(controller.onAdvance).toHaveBeenCalledExactlyOnceWith(defaultInput.feedbackKey)
    expect(controller.ticks.map((state) => state.remainingSeconds))
      .toEqual(Array.from({ length: delayMs / 1000 + 1 }, (_, index) => delayMs / 1000 - index))

    vi.advanceTimersByTime(20000)
    expect(controller.onAdvance).toHaveBeenCalledTimes(1)
  })

  it('does not reset the remaining time on repeated updates', () => {
    const controller = setup()
    controller.update()
    vi.advanceTimersByTime(1500)
    controller.update()
    controller.update()
    expect(controller.getState().remainingMs).toBe(1500)
    vi.advanceTimersByTime(1500)
    expect(controller.onAdvance).toHaveBeenCalledTimes(1)
    controller.update()
    vi.advanceTimersByTime(3000)
    expect(controller.onAdvance).toHaveBeenCalledTimes(1)
  })

  it('pauses and resumes with the exact remaining milliseconds', () => {
    const controller = setup()
    controller.update()
    vi.advanceTimersByTime(1250)
    controller.update({ blocked: true })
    expect(controller.getState()).toMatchObject({
      status: 'paused',
      remainingMs: 1750,
      remainingSeconds: 2,
    })
    vi.advanceTimersByTime(60000)
    controller.update({ blocked: true })
    expect(controller.getState().remainingMs).toBe(1750)
    expect(controller.onAdvance).not.toHaveBeenCalled()
    controller.update()
    vi.advanceTimersByTime(1749)
    expect(controller.onAdvance).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(controller.onAdvance).toHaveBeenCalledTimes(1)
  })

  it('starts paused while the caller blocks advancing', () => {
    const controller = setup()
    controller.update({ blocked: true })
    expect(controller.getState().status).toBe('paused')
    vi.advanceTimersByTime(5000)
    expect(controller.getState().remainingMs).toBe(3000)
    controller.update()
    vi.advanceTimersByTime(3000)
    expect(controller.onAdvance).toHaveBeenCalledTimes(1)
  })

  it('supports manual mode and resumes only when enabled and unblocked', () => {
    const controller = setup()
    controller.update()
    vi.advanceTimersByTime(1200)
    controller.update({ enabled: false })
    expect(controller.getState()).toMatchObject({ status: 'manual', remainingMs: 1800 })
    vi.advanceTimersByTime(60000)
    controller.update({ enabled: true, blocked: true })
    expect(controller.getState()).toMatchObject({ status: 'paused', remainingMs: 1800 })
    vi.advanceTimersByTime(60000)
    expect(controller.onAdvance).not.toHaveBeenCalled()
    controller.update()
    vi.advanceTimersByTime(1800)
    expect(controller.onAdvance).toHaveBeenCalledTimes(1)
  })

  it('keeps a newly displayed feedback in manual mode until explicitly enabled', () => {
    const controller = setup()
    controller.update({ enabled: false, delayMs: 8000 })
    vi.advanceTimersByTime(120000)
    expect(controller.getState()).toMatchObject({ status: 'manual', remainingMs: 8000 })
    expect(controller.onAdvance).not.toHaveBeenCalled()
    controller.update({ delayMs: 8000 })
    vi.advanceTimersByTime(8000)
    expect(controller.onAdvance).toHaveBeenCalledTimes(1)
  })

  it('cancels the active key without allowing it to be re-armed', () => {
    const controller = setup()
    controller.update()
    vi.advanceTimersByTime(500)
    controller.cancel()
    controller.cancel()
    controller.update()
    vi.advanceTimersByTime(10000)
    expect(controller.getState().status).toBe('finished')
    expect(controller.onAdvance).not.toHaveBeenCalled()
    controller.update({ feedbackKey: 'session-1:question-2' })
    vi.advanceTimersByTime(3000)
    expect(controller.onAdvance).toHaveBeenCalledExactlyOnceWith('session-1:question-2')
  })

  it('replaces timers when feedback changes and clears them when it disappears', () => {
    const controller = setup()
    controller.update()
    vi.advanceTimersByTime(2500)
    controller.update({ feedbackKey: 'session-1:question-2', delayMs: 8000 })
    vi.advanceTimersByTime(1000)
    expect(controller.onAdvance).not.toHaveBeenCalled()
    expect(controller.getState().remainingMs).toBe(7000)
    controller.update({ feedbackKey: null })
    vi.advanceTimersByTime(10000)
    expect(controller.getState()).toEqual({
      status: 'idle', feedbackKey: null, remainingMs: 0, remainingSeconds: 0,
    })
    expect(controller.onAdvance).not.toHaveBeenCalled()
  })

  it('disposes safely and ignores later updates', () => {
    const controller = setup()
    controller.update()
    controller.dispose()
    controller.dispose()
    controller.update({ feedbackKey: 'new-session:question-1' })
    vi.advanceTimersByTime(10000)
    expect(controller.onAdvance).not.toHaveBeenCalled()
    expect(controller.getState().status).toBe('idle')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not advance if a consumer cancels synchronously on the final tick', () => {
    const onAdvance = vi.fn()
    const controller = createAutoAdvance({
      onAdvance,
      onTick: (state) => {
        if (state.status === 'finished') controller.cancel()
      },
    })
    controller.update(defaultInput)
    vi.advanceTimersByTime(3000)
    expect(onAdvance).not.toHaveBeenCalled()
  })
})
