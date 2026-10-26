/** Opacity of each sprite pixel, row by row: one value from 0 to 255 per pixel. */
export interface AlphaMask {
  readonly width: number
  readonly height: number
  readonly alpha: ArrayLike<number>
}

/** A point inside the mascot window, in logical pixels from its top-left corner. */
export interface WindowPoint {
  readonly x: number
  readonly y: number
}

/**
 * Pixels at or below this opacity let clicks through (RF-05). A floor shadow of
 * 40–50% opacity would stay click-through without changing it.
 */
export const HIT_ALPHA_THRESHOLD = 128

/** Whether the window pixel under `point` belongs to the drawing, for a sprite scaled by `scale`. */
export function isInteractiveAt(mask: AlphaMask, point: WindowPoint, scale: number): boolean {
  const column = Math.floor(point.x / scale)
  const row = Math.floor(point.y / scale)
  if (column < 0 || row < 0 || column >= mask.width || row >= mask.height) {
    return false
  }
  return (mask.alpha[row * mask.width + column] ?? 0) > HIT_ALPHA_THRESHOLD
}
