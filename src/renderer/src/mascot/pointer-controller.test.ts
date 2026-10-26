import { describe, expect, it, vi } from 'vitest'
import type { AlphaMask } from '@domain/mascot/hit-test'
import { createPointerController } from './pointer-controller'

// 2×1 frame: left pixel opaque, right pixel transparent; drawn at scale 10.
const mask: AlphaMask = { width: 2, height: 1, alpha: [255, 0] }
const OVER = { x: 5, y: 5 }
const EMPTY = { x: 15, y: 5 }

function setup() {
  const mascot = { setInteractive: vi.fn(), drag: vi.fn() }
  const frames: (() => void)[] = []
  const controller = createPointerController({
    mascot,
    mask,
    scale: 10,
    scheduleFrame: (callback) => frames.push(callback),
  })
  const runFrames = (): void => {
    frames.splice(0).forEach((callback) => {
      callback()
    })
  }
  return { mascot, controller, runFrames }
}

describe('pointer controller: click-through (RF-05)', () => {
  it('reports only when the pointer enters or leaves the drawing', () => {
    const { mascot, controller } = setup()

    controller.move(EMPTY)
    controller.move(OVER)
    controller.move(OVER)
    controller.move(EMPTY)
    controller.move(EMPTY)

    expect(mascot.setInteractive.mock.calls).toEqual([[true], [false]])
  })

  it('lets clicks through again when the pointer leaves the window', () => {
    const { mascot, controller } = setup()

    controller.move(OVER)
    controller.leave()
    controller.leave()

    expect(mascot.setInteractive.mock.calls).toEqual([[true], [false]])
  })
})

describe('pointer controller: drag (RF-06)', () => {
  it('starts a drag only on the drawing', () => {
    const { mascot, controller } = setup()

    expect(controller.press(EMPTY)).toBe(false)
    expect(mascot.drag).not.toHaveBeenCalled()

    expect(controller.press(OVER)).toBe(true)
    expect(mascot.drag).toHaveBeenCalledExactlyOnceWith('start')
  })

  it('sends start, one move per frame and end, in order', () => {
    const { mascot, controller, runFrames } = setup()

    controller.press(OVER)
    controller.move({ x: 30, y: 5 })
    controller.move({ x: 40, y: 5 })
    runFrames()
    controller.move({ x: 50, y: 5 })
    runFrames()
    controller.release()

    expect(mascot.drag.mock.calls).toEqual([['start'], ['move'], ['move'], ['end']])
  })

  it('never lets clicks through during a drag, even off the drawing', () => {
    const { mascot, controller } = setup()

    controller.press(OVER)
    controller.move(EMPTY)
    controller.leave()

    expect(mascot.setInteractive.mock.calls).toEqual([[true]])
  })

  it('drops a move still waiting for its frame when the drag ends', () => {
    const { mascot, controller, runFrames } = setup()

    controller.press(OVER)
    controller.move({ x: 30, y: 5 })
    controller.release()
    runFrames()

    expect(mascot.drag.mock.calls).toEqual([['start'], ['end']])
  })

  it('ignores a release without a drag', () => {
    const { mascot, controller } = setup()

    controller.release()

    expect(mascot.drag).not.toHaveBeenCalled()
  })
})
