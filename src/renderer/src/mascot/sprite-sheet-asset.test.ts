import { describe, expect, it } from 'vitest'
import { HIT_ALPHA_THRESHOLD } from '@domain/mascot/hit-test'
import { decodeSheetMasks } from '@domain/mascot/mask-runs'
import { toSpriteSheet } from '@domain/mascot/sprite-sheet'
import { spriteMasksSchema, spriteSheetMetadataSchema } from '@shared/sprite-sheet-schema'
import metadata from '../assets/fai-sheet.json'
import masks from '../assets/fai-sheet.masks.json'

function realSheet() {
  const result = toSpriteSheet(spriteSheetMetadataSchema.parse(metadata))
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.sheet
}

describe('fai-sheet assets in the repository (RF-08 CA2, CA8)', () => {
  it('fai-sheet.json passes the schema and has the three animations with their timing', () => {
    const { frames, animations } = realSheet()

    expect(frames).toHaveLength(12)
    expect(frames.every(({ width, height }) => width === 376 && height === 320)).toBe(true)
    expect(animations.idle.loop).toBe(true)
    expect(animations.idle.frames.map((frame) => frame.durationMs)).toEqual(Array(8).fill(160))
    expect(animations.react).toMatchObject({ loop: false })
    expect(animations.react.frames.map((frame) => frame.durationMs)).toEqual([240, 240, 240])
    expect(animations.dragged).toMatchObject({ loop: true, frames: [{ index: 11 }] })
  })

  it('fai-sheet.masks.json matches the frames and the hit-test threshold', () => {
    const result = decodeSheetMasks(
      spriteMasksSchema.parse(masks),
      realSheet().frames,
      HIT_ALPHA_THRESHOLD,
    )
    if (!result.ok) {
      throw new Error(result.error)
    }
    const [idle] = result.masks
    const at = (x: number, y: number) => idle?.alpha[y * 376 + x]

    expect(result.masks).toHaveLength(12)
    // The corner is see-through background; the middle of the body receives clicks.
    expect(at(0, 0)).toBe(0)
    expect(at(188, 200)).toBe(255)
  })
})
