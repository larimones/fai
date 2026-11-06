import { describe, expect, it } from 'vitest'
import { spriteMasksSchema, spriteSheetMetadataSchema } from './sprite-sheet-schema'

const valid = {
  frames: [
    { filename: 'idle 0', frame: { x: 0, y: 0, w: 10, h: 8 }, rotated: false, duration: 100 },
  ],
  meta: {
    app: 'Aseprite',
    size: { w: 10, h: 8 },
    frameTags: [{ name: 'idle', from: 0, to: 0, direction: 'forward', color: '#000000ff' }],
  },
}

describe('spriteSheetMetadataSchema', () => {
  it('accepts Aseprite "JSON (Array)" and keeps only the fields the app uses', () => {
    expect(spriteSheetMetadataSchema.parse(valid)).toEqual({
      frames: [{ frame: { x: 0, y: 0, w: 10, h: 8 }, duration: 100 }],
      meta: { size: { w: 10, h: 8 }, frameTags: [{ name: 'idle', from: 0, to: 0 }] },
    })
  })

  it('rejects wrong types, missing fields and impossible values', () => {
    const frame = valid.frames[0]
    const cases = [
      { ...valid, frames: [{ ...frame, duration: '100' }] },
      { ...valid, frames: [{ ...frame, duration: 0 }] },
      { ...valid, frames: [{ ...frame, frame: { x: -1, y: 0, w: 10, h: 8 } }] },
      { ...valid, frames: [{ ...frame, frame: { x: 0, y: 0, w: 0, h: 8 } }] },
      { ...valid, frames: [] },
      { ...valid, meta: { ...valid.meta, frameTags: [{ name: 'idle', from: 0.5, to: 0 }] } },
      { frames: valid.frames },
      'not a sheet',
    ]

    for (const input of cases) {
      expect(spriteSheetMetadataSchema.safeParse(input).success).toBe(false)
    }
  })
})

describe('spriteMasksSchema', () => {
  const masks = { threshold: 128, width: 3, height: 2, frames: [[1, 3, 2]] }

  it('accepts the masks file', () => {
    expect(spriteMasksSchema.parse(masks)).toEqual(masks)
  })

  it('rejects impossible values', () => {
    const cases = [
      { ...masks, threshold: 256 },
      { ...masks, width: 0 },
      { ...masks, frames: [] },
      { ...masks, frames: [[1, -3, 2]] },
      { ...masks, frames: [[1.5, 3]] },
      { threshold: 128, width: 3, frames: [[6]] },
    ]

    for (const input of cases) {
      expect(spriteMasksSchema.safeParse(input).success).toBe(false)
    }
  })
})
