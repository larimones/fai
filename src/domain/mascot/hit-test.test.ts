import { describe, expect, it } from 'vitest'
import { type AlphaMask, HIT_ALPHA_THRESHOLD, isInteractiveAt } from './hit-test'

// 3×2 sprite:  opaque | transparent | threshold
//              above  | 0           | opaque
const mask: AlphaMask = {
  width: 3,
  height: 2,
  alpha: [255, 0, HIT_ALPHA_THRESHOLD, HIT_ALPHA_THRESHOLD + 1, 0, 255],
}

describe('isInteractiveAt (RF-05 CA3)', () => {
  it('is interactive only above the alpha threshold', () => {
    expect(isInteractiveAt(mask, { x: 0, y: 0 }, 1)).toBe(true)
    expect(isInteractiveAt(mask, { x: 1, y: 0 }, 1)).toBe(false)
    expect(isInteractiveAt(mask, { x: 2, y: 0 }, 1)).toBe(false)
    expect(isInteractiveAt(mask, { x: 0, y: 1 }, 1)).toBe(true)
  })

  it('maps every window pixel of a scaled-up sprite pixel to that sprite pixel', () => {
    expect(isInteractiveAt(mask, { x: 0, y: 0 }, 4)).toBe(true)
    expect(isInteractiveAt(mask, { x: 3.99, y: 3.99 }, 4)).toBe(true)
    expect(isInteractiveAt(mask, { x: 4, y: 0 }, 4)).toBe(false)
    expect(isInteractiveAt(mask, { x: 8, y: 4 }, 4)).toBe(true)
    expect(isInteractiveAt(mask, { x: 11.5, y: 7.5 }, 4)).toBe(true)
  })

  it('reads the right frame pixel when the frame is drawn at half size', () => {
    expect(isInteractiveAt(mask, { x: 0.4, y: 0.4 }, 0.5)).toBe(true)
    expect(isInteractiveAt(mask, { x: 0.5, y: 0 }, 0.5)).toBe(false)
    expect(isInteractiveAt(mask, { x: 1.4, y: 0.5 }, 0.5)).toBe(true)
  })

  it('is never interactive outside the sprite', () => {
    expect(isInteractiveAt(mask, { x: -0.5, y: 0 }, 4)).toBe(false)
    expect(isInteractiveAt(mask, { x: 0, y: -1 }, 4)).toBe(false)
    expect(isInteractiveAt(mask, { x: 12, y: 0 }, 4)).toBe(false)
    expect(isInteractiveAt(mask, { x: 0, y: 8 }, 4)).toBe(false)
  })
})
