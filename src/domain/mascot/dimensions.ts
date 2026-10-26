import type { Size } from './geometry'

/** Width and height of each sprite frame, in image pixels (ADR-0011). */
export const FRAME_SIZE_PX = 320

/** The mascot window, in logical pixels (ADR-0004, ADR-0011). */
export const MASCOT_WINDOW_SIZE: Size = { width: 160, height: 160 }

/**
 * From frame pixels to window pixels. Frames have twice the window's resolution
 * so the drawing stays sharp at display scales up to 200%.
 */
export const FRAME_TO_WINDOW_SCALE = MASCOT_WINDOW_SIZE.width / FRAME_SIZE_PX
