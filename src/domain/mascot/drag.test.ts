import { describe, expect, it } from 'vitest'
import { DRAG_THRESHOLD_PX, dragTo, endDrag, startDrag } from './drag'

const window = { x: 500, y: 300 }
const cursor = { x: 560, y: 360 }

describe('drag gesture (RF-06 CA2)', () => {
  it('treats a short press as a click and leaves the window in place', () => {
    const step = dragTo(startDrag(cursor, window), { x: 563, y: 360 })

    expect(step.position).toBeNull()
    expect(endDrag(step.state)).toBe('click')
  })

  it('treats a release without any movement as a click', () => {
    expect(endDrag(startDrag(cursor, window))).toBe('click')
  })

  it('starts moving at the threshold, measured as a straight-line distance', () => {
    expect(DRAG_THRESHOLD_PX).toBe(4)
    expect(dragTo(startDrag(cursor, window), { x: 563, y: 362 }).position).toBeNull()

    const step = dragTo(startDrag(cursor, window), { x: 563, y: 364 })

    expect(step.position).toEqual({ x: 503, y: 304 })
    expect(endDrag(step.state)).toBe('drag')
  })

  it('follows the cursor at the original offset, without a jump at the threshold', () => {
    let state = startDrag(cursor, window)
    const positions = [
      { x: 564, y: 360 },
      { x: 600, y: 330 },
      { x: 700, y: 420 },
    ].map((point) => {
      const step = dragTo(state, point)
      state = step.state
      return step.position
    })

    expect(positions).toEqual([
      { x: 504, y: 300 },
      { x: 540, y: 270 },
      { x: 640, y: 360 },
    ])
  })

  it('stays a drag after coming back close to the start', () => {
    const away = dragTo(startDrag(cursor, window), { x: 600, y: 360 })
    const back = dragTo(away.state, { x: 561, y: 360 })

    expect(back.position).toEqual({ x: 501, y: 300 })
    expect(endDrag(back.state)).toBe('drag')
  })

  it('works on monitors left of and above the primary one', () => {
    const state = startDrag({ x: -1800, y: -200 }, { x: -1860, y: -260 })

    expect(dragTo(state, { x: -1700, y: -150 }).position).toEqual({ x: -1760, y: -210 })
  })

  it('places the window on whole pixels', () => {
    const step = dragTo(startDrag(cursor, window), { x: 570.4, y: 360.6 })

    expect(step.position).toEqual({ x: 510, y: 301 })
  })
})
