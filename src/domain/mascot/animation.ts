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
  const time = loop ? elapsed % totalMs : elapsed
  let frameEnd = 0
  for (const frame of frames) {
    frameEnd += frame.durationMs
    if (time < frameEnd) {
      return { index: frame.index, msUntilNext: frameEnd - time, finished: false }
    }
  }
  // Only a play-once animation gets here: it ended and holds its last frame.
  return { index: last.index, msUntilNext: null, finished: true }
}

/** The animations the mascot needs, by name (ADR-0005, ADR-0013). */
export type AnimationName = 'idle' | 'react' | 'dragged'

export type AnimationSet = Readonly<Record<AnimationName, SpriteAnimation>>

export type MascotMood = 'idle' | 'reacting' | 'dragging'

export type AnimationEvent = 'click' | 'dragStart' | 'dragEnd'

export interface AnimationState {
  readonly mood: MascotMood
  /** When the current mood began, in ms on the caller's clock. */
  readonly since: number
}

export interface CurrentFrame {
  /** Same as the given state unless a reaction ended in the meantime. */
  readonly state: AnimationState
  readonly index: number
  readonly msUntilNext: number | null
}

const ANIMATION_OF: Readonly<Record<MascotMood, AnimationName>> = {
  idle: 'idle',
  reacting: 'react',
  dragging: 'dragged',
}

export function startAnimation(now: number): AnimationState {
  return { mood: 'idle', since: now }
}

/** Mood changes (RF-09 CA3). A click during a reaction or a drag changes nothing. */
export function handleAnimationEvent(
  state: AnimationState,
  event: AnimationEvent,
  now: number,
): AnimationState {
  switch (event) {
    case 'click':
      return state.mood === 'idle' ? { mood: 'reacting', since: now } : state
    case 'dragStart':
      return { mood: 'dragging', since: now }
    case 'dragEnd':
      return state.mood === 'dragging' ? { mood: 'idle', since: now } : state
  }
}

/** The frame to show at `now`; a finished reaction hands over to idle from the moment it ended. */
export function currentFrame(
  state: AnimationState,
  animations: AnimationSet,
  now: number,
): CurrentFrame {
  const animation = animations[ANIMATION_OF[state.mood]]
  const position = frameAt(animation, now - state.since)
  if (state.mood === 'reacting' && position.finished) {
    const totalMs = animation.frames.reduce((sum, frame) => sum + frame.durationMs, 0)
    return currentFrame(startAnimation(state.since + totalMs), animations, now)
  }
  return { state, index: position.index, msUntilNext: position.msUntilNext }
}
