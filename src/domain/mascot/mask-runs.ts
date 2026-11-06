import type { Rectangle } from './geometry'
import type { AlphaMask } from './hit-test'

/**
 * Click masks made by tools/art/build-sprites.py, already validated (ADR-0013). Each frame is a
 * list of run lengths, row by row, alternating see-through and clickable, starting see-through.
 */
export interface SheetMasks {
  /** The alpha threshold the masks were cut with. */
  readonly threshold: number
  readonly width: number
  readonly height: number
  readonly frames: readonly (readonly number[])[]
}

export type SheetMasksResult =
  | { readonly ok: true; readonly masks: readonly AlphaMask[] }
  | { readonly ok: false; readonly error: string }

/** Expands the runs into one mask per frame, checking they fit the sheet's frames. */
export function decodeSheetMasks(
  masks: SheetMasks,
  frames: readonly Rectangle[],
  threshold: number,
): SheetMasksResult {
  if (masks.threshold !== threshold) {
    return {
      ok: false,
      error: `As máscaras foram feitas com outro limiar de clique (${String(masks.threshold)}, esperado ${String(threshold)}).`,
    }
  }
  const { width, height } = masks
  if (
    masks.frames.length !== frames.length ||
    frames.some((frame) => frame.width !== width || frame.height !== height)
  ) {
    return { ok: false, error: 'As máscaras não correspondem aos quadros da folha.' }
  }
  const decoded: AlphaMask[] = []
  for (const [index, runs] of masks.frames.entries()) {
    const alpha = new Uint8ClampedArray(width * height)
    let position = 0
    for (const [run, length] of runs.entries()) {
      if (position + length > alpha.length) {
        position = Number.POSITIVE_INFINITY
        break
      }
      // Odd runs are clickable; the array starts at 0 (see-through).
      if (run % 2 === 1) {
        alpha.fill(255, position, position + length)
      }
      position += length
    }
    if (position !== alpha.length) {
      return {
        ok: false,
        error: `Máscara do quadro ${String(index)} não cobre ${String(width)}×${String(height)} pixels.`,
      }
    }
    decoded.push({ width, height, alpha })
  }
  return { ok: true, masks: decoded }
}
