import { describe, expect, it } from 'vitest'
import { PANEL_GAP_PX, placePanel } from './placement'

const PANEL = { width: 320, height: 440 }
const FAI = { width: 188, height: 160 }
// Primary monitor 1920×1080 with a 40 px taskbar at the bottom.
const WORK_AREA = { x: 0, y: 0, width: 1920, height: 1040 }

describe('placePanel (CA3)', () => {
  it('opens to the left of Fai in her default corner, bottoms aligned', () => {
    const fai = { x: 1716, y: 864, ...FAI }

    expect(placePanel(fai, PANEL, WORK_AREA)).toEqual({
      x: 1716 - PANEL_GAP_PX - 320,
      y: 864 + 160 - 440,
    })
  })

  it('opens to the right when there is no room on the left', () => {
    const fai = { x: 100, y: 600, ...FAI }

    expect(placePanel(fai, PANEL, WORK_AREA)).toEqual({ x: 100 + 188 + PANEL_GAP_PX, y: 320 })
  })

  it('stays inside the top of the work area when Fai is high up', () => {
    const fai = { x: 900, y: 40, ...FAI }

    expect(placePanel(fai, PANEL, WORK_AREA).y).toBe(0)
  })

  it('stays clear of a taskbar on the top or the left', () => {
    const shifted = { x: 60, y: 48, width: 1860, height: 1032 }

    expect(placePanel({ x: 70, y: 50, ...FAI }, PANEL, shifted)).toEqual({
      x: 70 + 188 + PANEL_GAP_PX,
      y: 48,
    })
  })

  it('works on a monitor left of the primary one (negative coordinates)', () => {
    const left = { x: -1366, y: 0, width: 1366, height: 728 }
    const fai = { x: -400, y: 500, ...FAI }

    expect(placePanel(fai, PANEL, left)).toEqual({ x: -400 - PANEL_GAP_PX - 320, y: 220 })
  })

  it('keeps the panel on screen when neither side has room', () => {
    const narrow = { x: 0, y: 0, width: 600, height: 1040 }
    const fai = { x: 200, y: 800, ...FAI }

    const { x } = placePanel(fai, PANEL, narrow)

    expect(x).toBeGreaterThanOrEqual(0)
    expect(x + 320).toBeLessThanOrEqual(600)
  })

  it('pins the panel to the top-left corner of a work area smaller than the panel', () => {
    const tiny = { x: 10, y: 20, width: 300, height: 400 }

    expect(placePanel({ x: 50, y: 60, ...FAI }, PANEL, tiny)).toEqual({ x: 10, y: 20 })
  })

  it('returns whole pixels', () => {
    const fai = { x: 1716.4, y: 864.6, ...FAI }
    const { x, y } = placePanel(fai, PANEL, WORK_AREA)

    expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true)
  })
})
