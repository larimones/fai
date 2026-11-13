import { Notification } from 'electron'
import type { NotifyOptions } from './desktop-integration'

/**
 * Native notifications, the same Electron API on Windows and Linux (ADR-0016). Each one is kept
 * until it closes: a garbage-collected Notification takes its click handler with it.
 */
export function createNotifier() {
  const open = new Set<Notification>()
  return {
    notify({ title, body, onClick }: NotifyOptions): void {
      const notification = new Notification({ title, body })
      open.add(notification)
      notification.on('click', onClick)
      notification.on('close', () => {
        open.delete(notification)
      })
      // Windows only: the toast could not be shown (no AppUserModelID, Focus Assist…).
      notification.on('failed', (_event, error) => {
        console.error('Fai: a notificação não pôde ser exibida.', error)
        open.delete(notification)
      })
      notification.show()
    },
    openNotifications: (): number => open.size,
  }
}
