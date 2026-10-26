import { Tray } from 'electron'
import type { DesktopIntegration } from './desktop-integration'

export const windowsDesktopIntegration: DesktopIntegration = {
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
}
