import type { Size } from './geometry'

/** Each sprite frame, in image pixels (ADR-0013). */
export const FRAME_SIZE: Size = { width: 376, height: 320 }

/** The mascot window, in logical pixels: wide enough for the open wings (ADR-0004, ADR-0013). */
export const MASCOT_WINDOW_SIZE: Size = { width: 188, height: 160 }

/**
 * From frame pixels to window pixels. Frames have twice the window's resolution
 * so the drawing stays sharp at display scales up to 200%.
 */
export const FRAME_TO_WINDOW_SCALE = MASCOT_WINDOW_SIZE.width / FRAME_SIZE.width
