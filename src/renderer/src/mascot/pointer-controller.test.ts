import { describe, expect, it, vi } from 'vitest'
import type { AlphaMask } from '@domain/mascot/hit-test'
import { createPointerController, type PointerGesture } from './pointer-controller'

// 2×1 frames drawn at scale 10: the drawing is on the left pixel, or on the right one.
const LEFT: AlphaMask = { width: 2, height: 1, alpha: [255, 0] }
const RIGHT: AlphaMask = { width: 2, height: 1, alpha: [0, 255] }
const OVER = { x: 5, y: 5 }
const EMPTY = { x: 15, y: 5 }
const SCREEN = { x: 500, y: 300 }

function setup() {
  const mascot = { setInteractive: vi.fn(), drag: vi.fn() }
  const gestures: PointerGesture[] = []
  const frames: (() => void)[] = []
  let mask = LEFT
  const controller = createPointerController({
    mascot,
    getMask: () => mask,
    scale: 10,
    scheduleFrame: (callback) => frames.push(callback),
    onGesture: (gesture) => gestures.push(gesture),
  })
  const runFrames = (): void => {
    frames.splice(0).forEach((callback) => {
      callback()
    })
  }
  const showFrame = (next: AlphaMask): void => {
    mask = next
  }
  return { mascot, controller, gestures, runFrames, showFrame }
}

describe('pointer controller: click-through (RF-05)', () => {
  it('reports only when the pointer enters or leaves the drawing', () => {
    const { mascot, controller } = setup()

    controller.move(EMPTY, SCREEN)
    controller.move(OVER, SCREEN)
    controller.move(OVER, SCREEN)
    controller.move(EMPTY, SCREEN)
    controller.move(EMPTY, SCREEN)

    expect(mascot.setInteractive.mock.calls).toEqual([[true], [false]])
  })

  it('lets clicks through again when the pointer leaves the window', () => {
    const { mascot, controller } = setup()

    controller.move(OVER, SCREEN)
    controller.leave()
    controller.leave()

    expect(mascot.setInteractive.mock.calls).toEqual([[true], [false]])
  })
})

describe('pointer controller: animated frames (CA8)', () => {
  it('tests against the frame on screen now', () => {
    const { mascot, controller, showFrame } = setup()

    showFrame(RIGHT)
    controller.move(EMPTY, SCREEN)

    expect(mascot.setInteractive.mock.calls).toEqual([[true]])
  })

  it('re-checks the still pointer when the frame changes, only on a change', () => {
    const { mascot, controller, showFrame } = setup()

    controller.move(OVER, SCREEN)
    showFrame(RIGHT)
    controller.refresh()
    controller.refresh()
    showFrame(LEFT)
    controller.refresh()

    expect(mascot.setInteractive.mock.calls).toEqual([[true], [false], [true]])
  })

  it('does nothing on a frame change before the pointer moved in, or after it left', () => {
    const { mascot, controller, showFrame } = setup()

    controller.refresh()
    controller.move(OVER, SCREEN)
    controller.leave()
    showFrame(RIGHT)
    controller.refresh()

    expect(mascot.setInteractive.mock.calls).toEqual([[true], [false]])
  })

  it('never lets clicks through on a frame change during a drag', () => {
    const { mascot, controller, showFrame } = setup()

    controller.press(OVER, SCREEN)
    showFrame(RIGHT)
    controller.refresh()

    expect(mascot.setInteractive.mock.calls).toEqual([[true]])
  })
})

describe('pointer controller: drag (RF-06)', () => {
  it('starts a drag only on the drawing', () => {
    const { mascot, controller } = setup()

    expect(controller.press(EMPTY, SCREEN)).toBe(false)
    expect(mascot.drag).not.toHaveBeenCalled()

    expect(controller.press(OVER, SCREEN)).toBe(true)
    expect(mascot.drag).toHaveBeenCalledExactlyOnceWith('start')
  })

  it('sends start, one move per frame and end, in order', () => {
    const { mascot, controller, runFrames } = setup()

    controller.press(OVER, SCREEN)
    controller.move({ x: 30, y: 5 }, { x: 525, y: 300 })
    controller.move({ x: 40, y: 5 }, { x: 535, y: 300 })
    runFrames()
    controller.move({ x: 50, y: 5 }, { x: 545, y: 300 })
    runFrames()
    controller.release()

    expect(mascot.drag.mock.calls).toEqual([['start'], ['move'], ['move'], ['end']])
  })

  it('never lets clicks through during a drag, even off the drawing', () => {
    const { mascot, controller } = setup()

    controller.press(OVER, SCREEN)
    controller.move(EMPTY, SCREEN)
    controller.leave()

    expect(mascot.setInteractive.mock.calls).toEqual([[true]])
  })

  it('drops a move still waiting for its frame when the drag ends', () => {
    const { mascot, controller, runFrames } = setup()

    controller.press(OVER, SCREEN)
    controller.move({ x: 30, y: 5 }, SCREEN)
    controller.release()
    runFrames()

    expect(mascot.drag.mock.calls).toEqual([['start'], ['end']])
  })

  it('ignores a release without a drag', () => {
    const { mascot, controller, gestures } = setup()

    controller.release()

    expect(mascot.drag).not.toHaveBeenCalled()
    expect(gestures).toEqual([])
  })
})

describe('pointer controller: gestures for the animation (RF-09)', () => {
  it('calls a release within 4 px of the press a click', () => {
    const { controller, gestures } = setup()

    controller.press(OVER, SCREEN)
    controller.move(OVER, { x: 503, y: 300 })
    controller.release()

    expect(gestures).toEqual(['click'])
  })

  it('starts the drag animation once the pointer travels 4 px, and ends it on release', () => {
    const { controller, gestures } = setup()

    controller.press(OVER, SCREEN)
    controller.move(OVER, { x: 504, y: 300 })
    controller.move(OVER, { x: 560, y: 340 })
    controller.move(OVER, { x: 501, y: 300 })
    controller.release()

    expect(gestures).toEqual(['dragStart', 'dragEnd'])
  })

  it('reports no gesture for a press off the drawing', () => {
    const { controller, gestures } = setup()

    controller.press(EMPTY, SCREEN)
    controller.release()

    expect(gestures).toEqual([])
  })
})
