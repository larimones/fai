import { Tray } from 'electron'
import type { DesktopIntegration } from './desktop-integration'
import { createNotifier } from './notifier'

export function createLinuxDesktopIntegration(): DesktopIntegration {
  const notifier = createNotifier()
  return {
    createTray({ icon, tooltip, menu }) {
      const tray = new Tray(icon)
      tray.setToolTip(tooltip)
      // AppIndicator/StatusNotifier trays emit no click events: every action lives in the menu.
      tray.setContextMenu(menu)
      return tray
    },
    setClickThrough() {
      // Linux has no `forward`: ignoring the mouse would also stop the moves the hit-test needs,
      // so the whole window keeps receiving clicks (ADR-0004).
    },
    prepareNotifications() {
      // Notifications go through the desktop's notification service (D-Bus or portal); nothing to set.
    },
    ...notifier,
  }
}
