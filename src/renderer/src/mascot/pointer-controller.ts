import { type AlphaMask, isInteractiveAt, type WindowPoint } from '@domain/mascot/hit-test'
import type { FaiApi } from '@shared/ipc/api'

export interface PointerControllerOptions {
  readonly mascot: FaiApi['mascot']
  readonly mask: AlphaMask
  /** Window pixels per frame pixel. */
  readonly scale: number
  /** Runs a callback before the next paint; at most one drag move is sent per frame. */
  readonly scheduleFrame: (callback: () => void) => void
}

export interface PointerController {
  move(point: WindowPoint): void
  /** Returns true when the press starts a drag, so the caller captures the pointer. */
  press(point: WindowPoint): boolean
  release(): void
  leave(): void
}

/** Turns pointer events on the mascot into click-through and drag messages (RF-05, RF-06). */
export function createPointerController(options: PointerControllerOptions): PointerController {
  const { mascot, mask, scale, scheduleFrame } = options
  let interactive = false
  let dragging = false
  let movePending = false

  const setInteractive = (next: boolean): void => {
    if (next !== interactive) {
      interactive = next
      mascot.setInteractive(next)
    }
  }

  return {
    move(point) {
      if (!dragging) {
        setInteractive(isInteractiveAt(mask, point, scale))
        return
      }
      if (!movePending) {
        movePending = true
        scheduleFrame(() => {
          movePending = false
          if (dragging) {
            mascot.drag('move')
          }
        })
      }
    },

    press(point) {
      if (!isInteractiveAt(mask, point, scale)) {
        return false
      }
      setInteractive(true)
      dragging = true
      mascot.drag('start')
      return true
    },

    release() {
      if (dragging) {
        dragging = false
        mascot.drag('end')
      }
    },

    leave() {
      // While dragging the pointer is captured and the window must keep receiving clicks.
      if (!dragging) {
        setInteractive(false)
      }
    },
  }
}
