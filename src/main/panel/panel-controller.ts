import type { ScreenPoint } from '@domain/data/fai-data'
import type { Rectangle, Size } from '@domain/mascot/geometry'
import { placePanel } from '@domain/panel/placement'
import { IpcChannels } from '@shared/ipc/channels'

/** The parts of the panel's BrowserWindow the controller uses. */
export interface PanelWindowPort {
  isVisible(): boolean
  setPosition(x: number, y: number): void
  show(): void
  focus(): void
  hide(): void
  on(event: 'blur', listener: () => void): unknown
  readonly webContents: {
    on(
      event: 'before-input-event',
      listener: (
        event: { preventDefault(): void },
        input: { readonly type: string; readonly key: string },
      ) => void,
    ): unknown
    send(channel: string): void
  }
}

export interface PanelControllerOptions {
  readonly window: PanelWindowPort
  readonly size: Size
  readonly mascotSize: Size
  readonly getMascotPosition: () => ScreenPoint
  /** The work area of the monitor showing the given rectangle. */
  readonly workAreaFor: (rectangle: Rectangle) => Rectangle
}

export interface PanelController {
  /** Shows the panel next to Fai and focuses it; if it is already open, only focuses it. */
  open(): void
  /** Keeps an open panel next to Fai, who was just moved to `position`. */
  follow(position: ScreenPoint): void
}

/** Opens, places and closes the task panel (CA3, CA4, ADR-0014). */
export function createPanelController(options: PanelControllerOptions): PanelController {
  const { window, size, mascotSize, getMascotPosition, workAreaFor } = options

  const placeNextTo = (position: ScreenPoint): void => {
    const mascot = { ...position, ...mascotSize }
    const { x, y } = placePanel(mascot, size, workAreaFor(mascot))
    window.setPosition(x, y)
  }

  // Clicking elsewhere, or opening a menu, takes the focus away: the panel closes itself.
  window.on('blur', () => {
    window.hide()
  })
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      window.hide()
    }
  })

  return {
    open() {
      if (!window.isVisible()) {
        placeNextTo(getMascotPosition())
        window.show()
      }
      window.focus()
      window.webContents.send(IpcChannels.panelOpened)
    },

    follow(position) {
      if (window.isVisible()) {
        placeNextTo(position)
      }
    },
  }
}
