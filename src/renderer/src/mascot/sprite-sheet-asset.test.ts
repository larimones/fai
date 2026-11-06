import { describe, expect, it } from 'vitest'
import { toSpriteSheet } from '@domain/mascot/sprite-sheet'
import { spriteSheetMetadataSchema } from '@shared/sprite-sheet-schema'
import metadata from '../assets/fai-sheet.json'

describe('fai-sheet.json in the repository (RF-08 CA2)', () => {
  it('passes the schema and has the three animations with their timing', () => {
    const result = toSpriteSheet(spriteSheetMetadataSchema.parse(metadata))
    if (!result.ok) {
      throw new Error(result.error)
    }
    const { frames, animations } = result.sheet

    expect(frames).toHaveLength(12)
    expect(frames.every(({ width, height }) => width === 376 && height === 320)).toBe(true)
    expect(animations.idle.loop).toBe(true)
    expect(animations.idle.frames.map((frame) => frame.durationMs)).toEqual(Array(8).fill(160))
    expect(animations.react).toMatchObject({ loop: false })
    expect(animations.react.frames.map((frame) => frame.durationMs)).toEqual([240, 240, 240])
    expect(animations.dragged).toMatchObject({ loop: true, frames: [{ index: 11 }] })
  })
})
