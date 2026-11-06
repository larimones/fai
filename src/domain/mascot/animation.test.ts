import { describe, expect, it } from 'vitest'
import { frameAt, type SpriteAnimation } from './animation'

// Frames 10, 11, 12 lasting 100, 50 and 200 ms (350 ms in all).
const frames = [
  { index: 10, durationMs: 100 },
  { index: 11, durationMs: 50 },
  { index: 12, durationMs: 200 },
]
const looping: SpriteAnimation = { frames, loop: true }
const once: SpriteAnimation = { frames, loop: false }

describe('frameAt (RF-08 CA2)', () => {
  it('shows each frame for its own duration', () => {
    expect(frameAt(looping, 0)).toEqual({ index: 10, msUntilNext: 100, finished: false })
    expect(frameAt(looping, 99)).toEqual({ index: 10, msUntilNext: 1, finished: false })
    expect(frameAt(looping, 120)).toEqual({ index: 11, msUntilNext: 30, finished: false })
    expect(frameAt(looping, 300)).toEqual({ index: 12, msUntilNext: 50, finished: false })
  })

  it('switches exactly when a duration ends', () => {
    expect(frameAt(looping, 100).index).toBe(11)
    expect(frameAt(looping, 150).index).toBe(12)
  })

  it('starts over after the last frame when looping', () => {
    expect(frameAt(looping, 350)).toEqual({ index: 10, msUntilNext: 100, finished: false })
    expect(frameAt(looping, 3 * 350 + 120)).toEqual({ index: 11, msUntilNext: 30, finished: false })
  })

  it('holds the last frame and reports the end when playing once', () => {
    expect(frameAt(once, 349)).toEqual({ index: 12, msUntilNext: 1, finished: false })
    expect(frameAt(once, 350)).toEqual({ index: 12, msUntilNext: null, finished: true })
    expect(frameAt(once, 10_000)).toEqual({ index: 12, msUntilNext: null, finished: true })
  })

  it('treats a time before the start as the start', () => {
    expect(frameAt(once, -5)).toEqual({ index: 10, msUntilNext: 100, finished: false })
  })
})
