export interface AnimationFrame {
  /** Position of the frame in the sprite sheet. */
  readonly index: number
  readonly durationMs: number
}

export interface SpriteAnimation {
  readonly frames: readonly AnimationFrame[]
  /** Repeats forever, or plays once and holds the last frame. */
  readonly loop: boolean
}

export interface FramePosition {
  readonly index: number
  /** Time until a different frame is due; `null` once a play-once animation has ended. */
  readonly msUntilNext: number | null
  readonly finished: boolean
}

/** Which frame shows `elapsedMs` after the animation started (RF-08 CA2). */
export function frameAt(animation: SpriteAnimation, elapsedMs: number): FramePosition {
  const { frames, loop } = animation
  const last = frames.at(-1)
  if (last === undefined) {
    throw new Error('Animação sem quadros.')
  }
  const totalMs = frames.reduce((sum, frame) => sum + frame.durationMs, 0)
  const elapsed = Math.max(0, elapsedMs)
  if (!loop && elapsed >= totalMs) {
    return { index: last.index, msUntilNext: null, finished: true }
  }
  const time = loop ? elapsed % totalMs : elapsed
  let frameEnd = 0
  for (const frame of frames) {
    frameEnd += frame.durationMs
    if (time < frameEnd) {
      return { index: frame.index, msUntilNext: frameEnd - time, finished: false }
    }
  }
  return { index: last.index, msUntilNext: null, finished: true }
}
