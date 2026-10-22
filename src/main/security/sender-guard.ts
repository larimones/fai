import type { IpcMainInvokeEvent, WebContents } from 'electron'
import type { SenderGuard } from '../ipc/invoke-handler'

/** Accepts IPC only from the top-level frame of a known window showing the app's own page. */
export function createSenderGuard(
  isAppUrl: (url: string) => boolean,
  isKnownWindow: (sender: WebContents) => boolean,
): SenderGuard {
  return (event: IpcMainInvokeEvent) => {
    const frame = event.senderFrame
    if (frame === null || frame !== event.sender.mainFrame) {
      return false
    }
    return isKnownWindow(event.sender) && isAppUrl(frame.url)
  }
}
