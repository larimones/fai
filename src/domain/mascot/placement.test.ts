import { describe, expect, it } from 'vitest'
import { type DisplayArea, resolveMascotPosition, SCREEN_MARGIN_PX } from './placement'

const size = { width: 128, height: 128 }
// A laptop screen on the left and the primary monitor on the right, with a 40 px taskbar.
const laptop: DisplayArea = {
  workArea: { x: -1366, y: 0, width: 1366, height: 728 },
  isPrimary: false,
}
const primary: DisplayArea = {
  workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  isPrimary: true,
}
const primaryCorner = { x: 1920 - 128 - SCREEN_MARGIN_PX, y: 1040 - 128 - SCREEN_MARGIN_PX }

describe('resolveMascotPosition (RF-07 CA2)', () => {
  it('keeps a saved position on any monitor', () => {
    expect(resolveMascotPosition({ x: 300, y: 200 }, [laptop, primary], size)).toEqual({
      x: 300,
      y: 200,
    })
    expect(resolveMascotPosition({ x: -800, y: 100 }, [laptop, primary], size)).toEqual({
      x: -800,
      y: 100,
    })
  })

  it('keeps a position that is only partly on screen', () => {
    expect(resolveMascotPosition({ x: 1900, y: 1000 }, [primary], size)).toEqual({
      x: 1900,
      y: 1000,
    })
  })

  it('moves to the primary corner when the saved monitor is gone', () => {
    expect(resolveMascotPosition({ x: -800, y: 100 }, [primary], size)).toEqual(primaryCorner)
  })

  it('moves to the primary corner when the mascot would only touch the edge', () => {
    expect(resolveMascotPosition({ x: 1920, y: 500 }, [primary], size)).toEqual(primaryCorner)
  })

  it('starts in the primary corner on the first run', () => {
    expect(resolveMascotPosition(null, [primary], size)).toEqual(primaryCorner)
  })

  it('finds the primary monitor wherever it is in the list', () => {
    expect(resolveMascotPosition(null, [laptop, primary], size)).toEqual(primaryCorner)
  })

  it('stays clear of a taskbar on the top or left', () => {
    const shifted: DisplayArea = {
      workArea: { x: 60, y: 48, width: 1860, height: 1032 },
      isPrimary: true,
    }

    expect(resolveMascotPosition(null, [shifted], size)).toEqual({
      x: 60 + 1860 - 128 - SCREEN_MARGIN_PX,
      y: 48 + 1032 - 128 - SCREEN_MARGIN_PX,
    })
  })
})
