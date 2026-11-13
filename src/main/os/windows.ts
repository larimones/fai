import { app, Tray } from 'electron'
import type { DesktopIntegration } from './desktop-integration'
import { createNotifier } from './notifier'

/** The app id the Windows installer (Stage 7) will register; toasts are grouped under it (ADR-0016). */
export const APP_USER_MODEL_ID = 'io.github.larimones.fai'

export function createWindowsDesktopIntegration(): DesktopIntegration {
  const notifier = createNotifier()
  return {
    createTray({ icon, tooltip, menu, onActivate }) {
      const tray = new Tray(icon)
      tray.setToolTip(tooltip)
      // Right click opens the context menu; left click is free for the primary action.
      tray.setContextMenu(menu)
      tray.on('click', onActivate)
      return tray
    },
    setClickThrough(window, enabled) {
      if (enabled) {
        // `forward` keeps mouse moves coming, so the renderer can tell when the cursor is back on the drawing.
        window.setIgnoreMouseEvents(true, { forward: true })
      } else {
        window.setIgnoreMouseEvents(false)
      }
    },
    prepareNotifications() {
      // Without it, toasts do not show or show as "electron.app.Electron" (ADR-0006).
      app.setAppUserModelId(APP_USER_MODEL_ID)
    },
    ...notifier,
  }
}
