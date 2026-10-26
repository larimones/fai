import type { Display } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import type { ScreenPoint } from '@domain/data/fai-data'
import { SCREEN_MARGIN_PX } from '@domain/mascot/placement'
import {
  createMascotController,
  initialMascotPosition,
  type MascotScreen,
  type MascotWindow,
} from './mascot-controller'

const PRIMARY = { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }
const LEFT = { id: 2, workArea: { x: -1366, y: 0, width: 1366, height: 728 } }
const PRIMARY_CORNER = { x: 1920 - 160 - SCREEN_MARGIN_PX, y: 1040 - 160 - SCREEN_MARGIN_PX }

function fakeScreen(displays = [LEFT, PRIMARY]) {
  const state = { cursor: { x: 0, y: 0 }, displays }
  const screen = {
    getCursorScreenPoint: vi.fn(() => state.cursor),
    getAllDisplays: vi.fn(() => state.displays as unknown as Display[]),
    getPrimaryDisplay: vi.fn(() => PRIMARY as unknown as Display),
  } satisfies MascotScreen
  return { state, screen }
}

function fakeWindow(start: ScreenPoint) {
  let position = start
  return {
    getPosition: vi.fn(() => [position.x, position.y]),
    setPosition: vi.fn((x: number, y: number) => {
      position = { x, y }
    }),
  } satisfies MascotWindow
}

function setup(start: ScreenPoint = { x: 500, y: 300 }) {
  const { state, screen } = fakeScreen()
  const window = fakeWindow(start)
  const setClickThrough = vi.fn()
  const savePosition = vi.fn()
  const controller = createMascotController({ window, screen, setClickThrough, savePosition })
  return { state, window, setClickThrough, savePosition, controller }
}

describe('mascot click-through (RF-05)', () => {
  it('lets clicks through from the start', () => {
    const { setClickThrough } = setup()

    expect(setClickThrough).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('switches only when the pointer enters or leaves the drawing', () => {
    const { controller, setClickThrough } = setup()
    setClickThrough.mockClear()

    controller.setInteractive(true)
    controller.setInteractive(true)
    controller.setInteractive(false)
    controller.setInteractive(false)

    expect(setClickThrough.mock.calls).toEqual([[false], [true]])
  })
})

describe('mascot drag (RF-06)', () => {
  it('moves with the cursor and saves only when the drag ends', () => {
    const { controller, state, window, savePosition } = setup()

    state.cursor = { x: 560, y: 360 }
    controller.drag('start')
    state.cursor = { x: 600, y: 380 }
    controller.drag('move')
    state.cursor = { x: 700, y: 400 }
    controller.drag('move')

    expect(window.setPosition.mock.calls).toEqual([
      [540, 320],
      [640, 340],
    ])
    expect(savePosition).not.toHaveBeenCalled()

    controller.drag('end')

    expect(savePosition).toHaveBeenCalledExactlyOnceWith({ x: 640, y: 340 })
  })

  it('saves where it put the window, even while the window still reports an older position', () => {
    const { controller, state, window, savePosition } = setup()
    // On X11 the window manager applies setPosition later; getPosition lags behind.
    window.setPosition.mockImplementation(() => undefined)

    state.cursor = { x: 560, y: 360 }
    controller.drag('start')
    state.cursor = { x: 700, y: 400 }
    controller.drag('move')
    controller.drag('end')

    expect(window.getPosition()).toEqual([500, 300])
    expect(savePosition).toHaveBeenCalledExactlyOnceWith({ x: 640, y: 340 })
  })

  it('treats a short press as a click: no move, nothing saved', () => {
    const { controller, state, window, savePosition } = setup()

    state.cursor = { x: 560, y: 360 }
    controller.drag('start')
    state.cursor = { x: 562, y: 361 }
    controller.drag('move')
    controller.drag('end')

    expect(window.setPosition).not.toHaveBeenCalled()
    expect(savePosition).not.toHaveBeenCalled()
  })

  it('ignores moves and ends without a start', () => {
    const { controller, state, window, savePosition } = setup()

    state.cursor = { x: 900, y: 900 }
    controller.drag('move')
    controller.drag('end')

    expect(window.setPosition).not.toHaveBeenCalled()
    expect(savePosition).not.toHaveBeenCalled()
  })

  it('forgets a finished drag', () => {
    const { controller, state, window } = setup()

    state.cursor = { x: 560, y: 360 }
    controller.drag('start')
    state.cursor = { x: 600, y: 360 }
    controller.drag('move')
    controller.drag('end')
    window.setPosition.mockClear()
    state.cursor = { x: 800, y: 800 }
    controller.drag('move')

    expect(window.setPosition).not.toHaveBeenCalled()
  })
})

describe('mascot position (RF-07)', () => {
  it('opens at the saved position, or in the primary corner when it is off screen', () => {
    const { screen } = fakeScreen()

    expect(initialMascotPosition({ x: -800, y: 100 }, screen)).toEqual({ x: -800, y: 100 })
    expect(initialMascotPosition(null, screen)).toEqual(PRIMARY_CORNER)
    expect(initialMascotPosition({ x: 5000, y: 100 }, screen)).toEqual(PRIMARY_CORNER)
  })

  it('comes back to the primary monitor and saves when its monitor is removed', () => {
    const { controller, state, window, savePosition } = setup({ x: -800, y: 100 })

    state.displays = [PRIMARY]
    controller.keepOnScreen()

    expect(window.setPosition).toHaveBeenCalledExactlyOnceWith(PRIMARY_CORNER.x, PRIMARY_CORNER.y)
    expect(savePosition).toHaveBeenCalledExactlyOnceWith(PRIMARY_CORNER)
  })

  it('stays put when monitors change but it is still visible', () => {
    const { controller, window, savePosition } = setup({ x: 300, y: 200 })

    controller.keepOnScreen()

    expect(window.setPosition).not.toHaveBeenCalled()
    expect(savePosition).not.toHaveBeenCalled()
  })
})
