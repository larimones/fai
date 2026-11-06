import { describe, expect, it } from 'vitest'
import { decodeSheetMasks, type SheetMasks } from './mask-runs'

const frames = [
  { x: 0, y: 0, width: 3, height: 2 },
  { x: 3, y: 0, width: 3, height: 2 },
]
// Frame 0: row 1 "· # #", row 2 "# · ·". Frame 1: all clickable (starts with an empty see-through run).
const masks: SheetMasks = {
  threshold: 128,
  width: 3,
  height: 2,
  frames: [
    [1, 3, 2],
    [0, 6],
  ],
}

describe('decodeSheetMasks (CA8)', () => {
  it('expands the runs into one mask per frame, see-through first', () => {
    const result = decodeSheetMasks(masks, frames, 128)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.masks.map((mask) => Array.from(mask.alpha))).toEqual([
      [0, 255, 255, 255, 0, 0],
      [255, 255, 255, 255, 255, 255],
    ])
    expect(result.masks[0]).toMatchObject({ width: 3, height: 2 })
  })

  it('rejects runs that do not cover the frame exactly', () => {
    expect(
      decodeSheetMasks(
        {
          ...masks,
          frames: [
            [1, 3, 1],
            [0, 6],
          ],
        },
        frames,
        128,
      ),
    ).toEqual({
      ok: false,
      error: 'Máscara do quadro 0 não cobre 3×2 pixels.',
    })
    expect(
      decodeSheetMasks(
        {
          ...masks,
          frames: [
            [1, 3, 2],
            [0, 7],
          ],
        },
        frames,
        128,
      ),
    ).toEqual({
      ok: false,
      error: 'Máscara do quadro 1 não cobre 3×2 pixels.',
    })
  })

  it('rejects masks made for other frames or another click threshold', () => {
    expect(decodeSheetMasks({ ...masks, frames: [[1, 3, 2]] }, frames, 128)).toEqual({
      ok: false,
      error: 'As máscaras não correspondem aos quadros da folha.',
    })
    expect(decodeSheetMasks({ ...masks, width: 4 }, frames, 128)).toEqual({
      ok: false,
      error: 'As máscaras não correspondem aos quadros da folha.',
    })
    expect(decodeSheetMasks(masks, frames, 100)).toEqual({
      ok: false,
      error: 'As máscaras foram feitas com outro limiar de clique (128, esperado 100).',
    })
  })
})
