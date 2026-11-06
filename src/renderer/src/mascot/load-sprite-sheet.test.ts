import { describe, expect, it, vi } from 'vitest'
import type { AlphaMask } from '@domain/mascot/hit-test'
import { cutFrames } from './load-sprite-sheet'

const A = { x: 0, y: 0, width: 4, height: 2 }
const B = { x: 4, y: 0, width: 4, height: 2 }

function mask(fill: number): AlphaMask {
  return { width: 4, height: 2, alpha: new Uint8ClampedArray(8).fill(fill) }
}

describe('cutFrames (ADR-0013: frames may share a drawing)', () => {
  it('cuts each drawing once and shares the image and the mask between its frames', async () => {
    const cut = vi.fn((rectangle: typeof A) =>
      Promise.resolve({ cutFrom: rectangle.x } as unknown as ImageBitmap),
    )
    const masks = [mask(255), mask(0), mask(255), mask(255)]

    const frames = await cutFrames([A, B, A, A], masks, cut)

    expect(cut).toHaveBeenCalledTimes(2)
    expect(frames).toHaveLength(4)
    expect(frames[2]?.image).toBe(frames[0]?.image)
    expect(frames[3]?.mask).toBe(frames[0]?.mask)
    expect(frames[1]?.image).not.toBe(frames[0]?.image)
    expect(frames[1]?.mask).toBe(masks[1])
  })
})
