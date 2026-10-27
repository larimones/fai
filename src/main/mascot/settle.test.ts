import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runWhenSettled } from './settle'

describe('runWhenSettled (RF-07)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs once, after a burst of triggers has been quiet for the delay', () => {
    const run = vi.fn()
    const trigger = runWhenSettled(run, 1000)

    trigger()
    vi.advanceTimersByTime(600)
    trigger()
    vi.advanceTimersByTime(600)
    trigger()
    vi.advanceTimersByTime(999)

    expect(run).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)

    expect(run).toHaveBeenCalledOnce()
  })

  it('runs again for a later, separate burst', () => {
    const run = vi.fn()
    const trigger = runWhenSettled(run, 1000)

    trigger()
    vi.advanceTimersByTime(1000)
    trigger()
    vi.advanceTimersByTime(1000)

    expect(run).toHaveBeenCalledTimes(2)
  })
})
