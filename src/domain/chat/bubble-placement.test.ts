import { describe, expect, it } from 'vitest'
import { BUBBLE_GAP_PX, placeBubble, TAIL_MARGIN_PX } from './bubble-placement'

const BUBBLE = { width: 300, height: 380 }
const FAI = { width: 188, height: 160 }
// Primary monitor 1920×1080 with a 40 px taskbar at the bottom.
const WORK_AREA = { x: 0, y: 0, width: 1920, height: 1040 }

describe('placeBubble (CA1, ADR-0017)', () => {
  it('opens above Fai, centered on her, with the tail pointing down at her', () => {
    const fai = { x: 800, y: 600, ...FAI }

    expect(placeBubble(fai, BUBBLE, WORK_AREA)).toEqual({
      x: 800 + 94 - 150,
      y: 600 - BUBBLE_GAP_PX - 380,
      tail: 'down',
      tailAt: 150,
    })
  })

  it('in her default corner, stays inside the right edge and moves the tail to stay on her', () => {
    const fai = { x: 1716, y: 864, ...FAI }

    const placed = placeBubble(fai, BUBBLE, WORK_AREA)

    expect(placed).toEqual({ x: 1620, y: 864 - BUBBLE_GAP_PX - 380, tail: 'down', tailAt: 190 })
    expect(placed.x + placed.tailAt).toBe(1716 + 94)
  })

  it('keeps the tail away from the corners when Fai is at the very edge', () => {
    const fai = { x: 1900, y: 864, ...FAI }

    expect(placeBubble(fai, BUBBLE, WORK_AREA).tailAt).toBe(300 - TAIL_MARGIN_PX)
  })

  it('opens beside Fai, tail pointing at her, when there is no room above', () => {
    const left = placeBubble({ x: 1000, y: 100, ...FAI }, BUBBLE, WORK_AREA)
    expect(left).toEqual({ x: 1000 - BUBBLE_GAP_PX - 300, y: 0, tail: 'right', tailAt: 180 })

    const right = placeBubble({ x: 100, y: 100, ...FAI }, BUBBLE, WORK_AREA)
    expect(right).toMatchObject({ x: 100 + 188 + BUBBLE_GAP_PX, tail: 'left' })
  })

  it('works on a monitor left of the primary one (negative coordinates)', () => {
    const work = { x: -1280, y: 0, width: 1280, height: 984 }

    expect(placeBubble({ x: -700, y: 600, ...FAI }, BUBBLE, work)).toEqual({
      x: -700 + 94 - 150,
      y: 600 - BUBBLE_GAP_PX - 380,
      tail: 'down',
      tailAt: 150,
    })
  })

  it('pins the top-left corner when the work area is smaller than the bubble', () => {
    const tiny = { x: 10, y: 20, width: 200, height: 200 }

    expect(placeBubble({ x: 10, y: 20, ...FAI }, BUBBLE, tiny)).toMatchObject({ x: 10, y: 20 })
  })
})
