import type { BrowserWindow, Display, Screen } from 'electron'
import type { ScreenPoint } from '@domain/data/fai-data'
import { MASCOT_WINDOW_SIZE } from '@domain/mascot/dimensions'
import { type DragState, dragTo, endDrag, startDrag } from '@domain/mascot/drag'
import { type DisplayArea, resolveMascotPosition } from '@domain/mascot/placement'
import type { DragPhase } from '@shared/ipc/api'

export type MascotScreen = Pick<
  Screen,
  'getCursorScreenPoint' | 'getAllDisplays' | 'getPrimaryDisplay'
>

export type MascotWindow = Pick<BrowserWindow, 'getPosition' | 'setPosition'>

export interface MascotControllerOptions {
  readonly window: MascotWindow
  readonly screen: MascotScreen
  readonly setClickThrough: (enabled: boolean) => void
  /** Persists a position the user chose or the app had to correct. */
  readonly savePosition: (position: ScreenPoint) => void
}

export interface MascotController {
  /** The pointer entered (`true`) or left (`false`) the drawing (RF-05). */
  setInteractive(interactive: boolean): void
  drag(phase: DragPhase): void
  /** Brings the mascot back on screen after monitors change (RF-07 CA2). */
  keepOnScreen(): void
}

export function toDisplayAreas(
  screen: Pick<Screen, 'getAllDisplays' | 'getPrimaryDisplay'>,
): DisplayArea[] {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((display: Display) => ({
    workArea: display.workArea,
    isPrimary: display.id === primaryId,
  }))
}

/** Where the mascot window opens: the saved position, unless no monitor shows it anymore. */
export function initialMascotPosition(
  saved: ScreenPoint | null,
  screen: MascotScreen,
): ScreenPoint {
  return resolveMascotPosition(saved, toDisplayAreas(screen), MASCOT_WINDOW_SIZE)
}

export function createMascotController(options: MascotControllerOptions): MascotController {
  const { window, screen, setClickThrough, savePosition } = options
  let interactive = false
  let drag: DragState | null = null
  // On X11 the window manager applies setPosition later, so getPosition can lag behind a drag.
  let draggedTo: ScreenPoint | null = null

  const windowPosition = (): ScreenPoint => {
    const [x = 0, y = 0] = window.getPosition()
    return { x, y }
  }

  // Clicks go through until the pointer is over the drawing.
  setClickThrough(true)

  return {
    setInteractive(next) {
      if (next !== interactive) {
        interactive = next
        setClickThrough(!next)
      }
    },

    drag(phase) {
      switch (phase) {
        case 'start':
          drag = startDrag(screen.getCursorScreenPoint(), windowPosition())
          draggedTo = null
          break
        case 'move': {
          if (drag === null) {
            return
          }
          const step = dragTo(drag, screen.getCursorScreenPoint())
          drag = step.state
          if (step.position !== null) {
            window.setPosition(step.position.x, step.position.y)
            draggedTo = step.position
          }
          break
        }
        case 'end':
          if (drag !== null && endDrag(drag) === 'drag' && draggedTo !== null) {
            savePosition(draggedTo)
          }
          drag = null
          draggedTo = null
          break
      }
    },

    keepOnScreen() {
      const current = windowPosition()
      const next = resolveMascotPosition(current, toDisplayAreas(screen), MASCOT_WINDOW_SIZE)
      if (next.x !== current.x || next.y !== current.y) {
        window.setPosition(next.x, next.y)
        savePosition(next)
      }
    },
  }
}
