import type { ScreenPoint } from '@domain/data/fai-data'
import { type DragState, dragTo, endDrag, startDrag } from '@domain/mascot/drag'
import { type AlphaMask, isInteractiveAt, type WindowPoint } from '@domain/mascot/hit-test'
import type { FaiApi } from '@shared/ipc/api'

/** What the animation needs to know about the pointer (RF-09). */
export type PointerGesture = 'click' | 'dragStart' | 'dragEnd'

export interface PointerControllerOptions {
  readonly mascot: Pick<FaiApi['mascot'], 'setInteractive' | 'drag'>
  /** Opacity of the frame on screen now; it changes as the mascot animates. */
  readonly getMask: () => AlphaMask
  /** Window pixels per frame pixel. */
  readonly scale: number
  /** Runs a callback before the next paint; at most one drag move is sent per frame. */
  readonly scheduleFrame: (callback: () => void) => void
  readonly onGesture: (gesture: PointerGesture) => void
}

export interface PointerController {
  /** `point` is in window pixels, for the hit-test; `screen` measures how far a press travelled. */
  move(point: WindowPoint, screen: ScreenPoint): void
  /** Returns true when the press starts a drag, so the caller captures the pointer. */
  press(point: WindowPoint, screen: ScreenPoint): boolean
  release(): void
  leave(): void
  /** Re-checks a still pointer after the frame changed under it (CA8). */
  refresh(): void
  /** Whether a right click at `point` should open Fai's menu: only on the drawing (RF-10 CA1). */
  wantsMenu(point: WindowPoint): boolean
}

/** Turns pointer events on the mascot into click-through, drag messages and gestures (RF-05, RF-06, RF-09). */
export function createPointerController(options: PointerControllerOptions): PointerController {
  const { mascot, getMask, scale, scheduleFrame, onGesture } = options
  let interactive = false
  let lastPoint: WindowPoint | null = null
  // Set from press to release; the same 4 px rule as the main process tells a click from a drag.
  let press: DragState | null = null
  let movePending = false

  const setInteractive = (next: boolean): void => {
    if (next !== interactive) {
      interactive = next
      mascot.setInteractive(next)
    }
  }

  return {
    move(point, screen) {
      lastPoint = point
      if (press === null) {
        setInteractive(isInteractiveAt(getMask(), point, scale))
        return
      }
      const wasMoving = press.moved
      press = dragTo(press, screen).state
      if (press.moved && !wasMoving) {
        onGesture('dragStart')
      }
      if (!movePending) {
        movePending = true
        scheduleFrame(() => {
          movePending = false
          if (press !== null) {
            mascot.drag('move')
          }
        })
      }
    },

    press(point, screen) {
      lastPoint = point
      if (!isInteractiveAt(getMask(), point, scale)) {
        return false
      }
      setInteractive(true)
      press = startDrag(screen, { x: 0, y: 0 })
      mascot.drag('start')
      return true
    },

    release() {
      if (press === null) {
        return
      }
      const gesture = endDrag(press) === 'drag' ? 'dragEnd' : 'click'
      press = null
      mascot.drag('end')
      onGesture(gesture)
    },

    leave() {
      // While dragging the pointer is captured and the window must keep receiving clicks.
      if (press === null) {
        lastPoint = null
        setInteractive(false)
      }
    },

    wantsMenu(point) {
      return isInteractiveAt(getMask(), point, scale)
    },

    refresh() {
      if (press === null && lastPoint !== null) {
        setInteractive(isInteractiveAt(getMask(), lastPoint, scale))
      }
    },
  }
}
