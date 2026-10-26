import type { Size } from './geometry'

/** Width and height of each sprite frame, in sprite pixels (ADR-0005). */
export const SPRITE_SIZE_PX = 32

/** Whole-number zoom from sprite pixels to logical pixels, so pixel art stays sharp (ADR-0005). */
export const SPRITE_SCALE = 4

/** The mascot window is exactly one scaled frame (ADR-0004). */
export const MASCOT_WINDOW_SIZE: Size = {
  width: SPRITE_SIZE_PX * SPRITE_SCALE,
  height: SPRITE_SIZE_PX * SPRITE_SCALE,
}
