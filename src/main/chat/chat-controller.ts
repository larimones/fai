import { placeBubble } from '@domain/chat/bubble-placement'
import type { ScreenPoint } from '@domain/data/fai-data'
import type { Rectangle, Size } from '@domain/mascot/geometry'
import type { ChatMode, ChatOpened, ChatPlaced } from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'
import type { PanelWindowPort } from '../panel/panel-controller'

export interface ChatControllerOptions {
  /** The same parts of a BrowserWindow the panel controller uses. */
  readonly window: PanelWindowPort
  readonly size: Size
  readonly mascotSize: Size
  readonly getMascotPosition: () => ScreenPoint
  readonly workAreaFor: (rectangle: Rectangle) => Rectangle
  readonly status: () => Omit<ChatOpened, 'mode'>
  /** Runs before the bubble shows: the panel steps aside. */
  readonly onOpen: () => void
  /** The bubble closed: the conversation ends (RF-18 CA3). */
  readonly onClose: () => void
}

export interface ChatController {
  /** Opens the bubble on a fresh conversation; without a key it asks for one first. */
  open(mode: ChatMode): void
  /** Keeps an open bubble on Fai, who was just moved to `position`. */
  follow(position: ScreenPoint): void
  hide(): void
}

/** Opens, places and closes the chat bubble (CA1, CA4, ADR-0017). */
export function createChatController(options: ChatControllerOptions): ChatController {
  const { window, size, mascotSize, getMascotPosition, workAreaFor, status, onOpen, onClose } =
    options

  const placeAt = (position: ScreenPoint): void => {
    const mascot = { ...position, ...mascotSize }
    const { x, y, tail, tailAt } = placeBubble(mascot, size, workAreaFor(mascot))
    window.setPosition(x, y)
    window.webContents.send(IpcChannels.chatPlaced, { tail, tailAt } satisfies ChatPlaced)
  }

  const close = (): void => {
    window.hide()
    onClose()
  }

  // Clicking elsewhere or opening a menu takes the focus away: the bubble closes, like the panel.
  window.on('blur', () => {
    if (window.isVisible()) {
      close()
    }
  })
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      close()
    }
  })

  return {
    open(mode) {
      if (window.isVisible()) {
        close()
      }
      onOpen()
      placeAt(getMascotPosition())
      window.show()
      window.focus()
      const current = status()
      const shown = current.hasKey ? mode : 'key'
      window.webContents.send(IpcChannels.chatOpened, {
        mode: shown,
        ...current,
      } satisfies ChatOpened)
    },

    follow(position) {
      if (window.isVisible()) {
        placeAt(position)
      }
    },

    hide() {
      if (window.isVisible()) {
        close()
      }
    },
  }
}
