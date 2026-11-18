import { safeStorage, Tray } from 'electron'
import type { DesktopIntegration } from './desktop-integration'
import { createNotifier } from './notifier'
import { osEncryptedStorage } from './safe-storage'

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
    async secretStorage() {
      // Without a recognized keyring Electron falls back to `basic_text`, whose cipher uses a fixed
      // password: that would only look protected, so the key stays in memory instead.
      const backend = safeStorage.getSelectedStorageBackend()
      const realKeyring = backend !== 'basic_text' && backend !== 'unknown'
      return realKeyring && (await safeStorage.isAsyncEncryptionAvailable())
        ? osEncryptedStorage()
        : { persists: false }
    },
    ...notifier,
  }
}
