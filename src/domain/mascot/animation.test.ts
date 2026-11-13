import { describe, expect, it } from 'vitest'
import {
  type AnimationSet,
  currentFrame,
  frameAt,
  handleAnimationEvent,
  type SpriteAnimation,
  startAnimation,
} from './animation'

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

// idle: 2 frames of 100 ms, looping; react: 2 frames of 150 ms, once; dragged: 1 frame.
const animations: AnimationSet = {
  idle: {
    frames: [
      { index: 0, durationMs: 100 },
      { index: 1, durationMs: 100 },
    ],
    loop: true,
  },
  react: {
    frames: [
      { index: 2, durationMs: 150 },
      { index: 3, durationMs: 150 },
    ],
    loop: false,
  },
  dragged: { frames: [{ index: 4, durationMs: 1000 }], loop: true },
  celebrate: {
    frames: [
      { index: 5, durationMs: 80 },
      { index: 6, durationMs: 80 },
      { index: 7, durationMs: 240 },
    ],
    loop: false,
  },
  remind: {
    frames: [
      { index: 2, durationMs: 100 },
      { index: 3, durationMs: 100 },
    ],
    loop: false,
  },
}

describe('mascot animation states (RF-09 CA3)', () => {
  it('starts idle, looping', () => {
    const state = startAnimation(1000)

    expect(currentFrame(state, animations, 1000)).toMatchObject({
      state: { mood: 'idle' },
      index: 0,
    })
    expect(currentFrame(state, animations, 1250)).toMatchObject({ index: 0 })
    expect(currentFrame(state, animations, 1350)).toMatchObject({ index: 1 })
  })

  it('goes idle → reacting → idle when the reaction ends', () => {
    const reacting = handleAnimationEvent(startAnimation(0), 'click', 500)

    expect(currentFrame(reacting, animations, 500)).toMatchObject({
      state: { mood: 'reacting' },
      index: 2,
      msUntilNext: 150,
    })
    expect(currentFrame(reacting, animations, 799)).toMatchObject({ index: 3, msUntilNext: 1 })
    // The reaction ended at 800; idle starts from there, not from when it is asked.
    expect(currentFrame(reacting, animations, 950)).toEqual({
      state: { mood: 'idle', since: 800 },
      index: 1,
      msUntilNext: 50,
    })
  })

  it('does not restart or stack a reaction on a click during it', () => {
    const reacting = handleAnimationEvent(startAnimation(0), 'click', 500)

    expect(handleAnimationEvent(reacting, 'click', 700)).toBe(reacting)
  })

  it('goes idle → dragging → idle', () => {
    const dragging = handleAnimationEvent(startAnimation(0), 'dragStart', 300)

    expect(currentFrame(dragging, animations, 5000)).toMatchObject({
      state: { mood: 'dragging' },
      index: 4,
    })
    expect(handleAnimationEvent(dragging, 'dragEnd', 6000)).toEqual({ mood: 'idle', since: 6000 })
  })

  it('lets a drag interrupt a reaction', () => {
    const reacting = handleAnimationEvent(startAnimation(0), 'click', 500)

    expect(handleAnimationEvent(reacting, 'dragStart', 600)).toEqual({
      mood: 'dragging',
      since: 600,
    })
  })

  it('ignores a drag end without a drag and a click while dragging', () => {
    const idle = startAnimation(0)
    const dragging = handleAnimationEvent(idle, 'dragStart', 100)

    expect(handleAnimationEvent(idle, 'dragEnd', 200)).toBe(idle)
    expect(handleAnimationEvent(dragging, 'click', 200)).toBe(dragging)
  })
})

describe('celebrating (RF-12 CA2)', () => {
  it('celebrates once and then goes back to idle from the moment it ended', () => {
    const celebrating = handleAnimationEvent(startAnimation(0), 'celebrate', 1000)

    expect(currentFrame(celebrating, animations, 1000)).toMatchObject({
      state: { mood: 'celebrating' },
      index: 5,
      msUntilNext: 80,
    })
    expect(currentFrame(celebrating, animations, 1170)).toMatchObject({ index: 7 })
    // It ended at 1400; idle starts from there.
    expect(currentFrame(celebrating, animations, 1450)).toEqual({
      state: { mood: 'idle', since: 1400 },
      index: 0,
      msUntilNext: 50,
    })
  })

  it('interrupts a reaction', () => {
    const reacting = handleAnimationEvent(startAnimation(0), 'click', 100)

    expect(handleAnimationEvent(reacting, 'celebrate', 200)).toEqual({
      mood: 'celebrating',
      since: 200,
    })
  })

  it('skips the celebration while Fai is being carried', () => {
    const dragging = handleAnimationEvent(startAnimation(0), 'dragStart', 100)

    expect(handleAnimationEvent(dragging, 'celebrate', 200)).toBe(dragging)
  })

  it('ignores clicks during the celebration, and a drag interrupts it', () => {
    const celebrating = handleAnimationEvent(startAnimation(0), 'celebrate', 100)

    expect(handleAnimationEvent(celebrating, 'click', 150)).toBe(celebrating)
    expect(handleAnimationEvent(celebrating, 'dragStart', 160)).toEqual({
      mood: 'dragging',
      since: 160,
    })
  })
})

describe('reminding (RF-15 CA1)', () => {
  it('plays once and then goes back to idle from the moment it ended', () => {
    const reminding = handleAnimationEvent(startAnimation(0), 'remind', 1000)

    expect(currentFrame(reminding, animations, 1000)).toMatchObject({
      state: { mood: 'reminding' },
      index: 2,
    })
    expect(currentFrame(reminding, animations, 1150)).toMatchObject({ index: 3 })
    expect(currentFrame(reminding, animations, 1250)).toEqual({
      state: { mood: 'idle', since: 1200 },
      index: 0,
      msUntilNext: 50,
    })
  })

  it('interrupts idle, a reaction and a celebration, and is skipped while Fai is carried', () => {
    const reacting = handleAnimationEvent(startAnimation(0), 'click', 100)
    const celebrating = handleAnimationEvent(startAnimation(0), 'celebrate', 100)
    const dragging = handleAnimationEvent(startAnimation(0), 'dragStart', 100)

    expect(handleAnimationEvent(reacting, 'remind', 200)).toEqual({ mood: 'reminding', since: 200 })
    expect(handleAnimationEvent(celebrating, 'remind', 200)).toEqual({
      mood: 'reminding',
      since: 200,
    })
    expect(handleAnimationEvent(dragging, 'remind', 200)).toBe(dragging)
  })

  it('ignores clicks while reminding', () => {
    const reminding = handleAnimationEvent(startAnimation(0), 'remind', 100)

    expect(handleAnimationEvent(reminding, 'click', 150)).toBe(reminding)
  })
})
