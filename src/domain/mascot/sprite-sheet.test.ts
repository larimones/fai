import { describe, expect, it } from 'vitest'
import { type SheetMetadata, toSpriteSheet } from './sprite-sheet'

function frame(x: number, duration: number) {
  return { frame: { x, y: 0, w: 10, h: 8 }, duration }
}

// Frames 0–1 idle, 2 react, 3 dragged, 4 celebrate. Frame 4 reuses frame 0's drawing with
// another duration, as Aseprite's "merge duplicates" export does (ADR-0013).
const metadata: SheetMetadata = {
  frames: [frame(0, 100), frame(10, 120), frame(20, 240), frame(30, 1000), frame(0, 80)],
  meta: {
    size: { w: 40, h: 8 },
    frameTags: [
      { name: 'idle', from: 0, to: 1 },
      { name: 'react', from: 2, to: 2 },
      { name: 'dragged', from: 3, to: 3 },
      { name: 'celebrate', from: 4, to: 4 },
    ],
  },
}

describe('toSpriteSheet', () => {
  it('turns the tags into animations by name, looping idle and dragged only', () => {
    const result = toSpriteSheet(metadata)

    expect(result).toEqual({
      ok: true,
      sheet: {
        frames: [
          { x: 0, y: 0, width: 10, height: 8 },
          { x: 10, y: 0, width: 10, height: 8 },
          { x: 20, y: 0, width: 10, height: 8 },
          { x: 30, y: 0, width: 10, height: 8 },
          { x: 0, y: 0, width: 10, height: 8 },
        ],
        animations: {
          idle: {
            frames: [
              { index: 0, durationMs: 100 },
              { index: 1, durationMs: 120 },
            ],
            loop: true,
          },
          react: { frames: [{ index: 2, durationMs: 240 }], loop: false },
          dragged: { frames: [{ index: 3, durationMs: 1000 }], loop: true },
          celebrate: { frames: [{ index: 4, durationMs: 80 }], loop: false },
        },
      },
    })
  })

  it('rejects a sheet without one of the animations the mascot needs', () => {
    const withoutReact = {
      ...metadata,
      meta: {
        ...metadata.meta,
        frameTags: metadata.meta.frameTags.filter((t) => t.name !== 'react'),
      },
    }

    expect(toSpriteSheet(withoutReact)).toEqual({ ok: false, error: 'Animação "react" ausente.' })
  })

  it('rejects tags that point outside the frames or run backwards', () => {
    const outside = {
      ...metadata,
      meta: {
        ...metadata.meta,
        frameTags: [...metadata.meta.frameTags.slice(1), { name: 'idle', from: 3, to: 5 }],
      },
    }
    const backwards = {
      ...metadata,
      meta: {
        ...metadata.meta,
        frameTags: [...metadata.meta.frameTags.slice(1), { name: 'idle', from: 1, to: 0 }],
      },
    }

    expect(toSpriteSheet(outside)).toEqual({
      ok: false,
      error: 'Animação "idle" fora dos quadros.',
    })
    expect(toSpriteSheet(backwards)).toEqual({
      ok: false,
      error: 'Animação "idle" fora dos quadros.',
    })
  })

  it('rejects frames that fall outside the sheet image', () => {
    const tooWide = { ...metadata, meta: { ...metadata.meta, size: { w: 35, h: 8 } } }

    expect(toSpriteSheet(tooWide)).toEqual({ ok: false, error: 'Quadro 3 fora da imagem.' })
  })
})
