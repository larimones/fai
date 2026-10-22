import type { BrowserWindow } from 'electron'

export type RevealableWindow = Pick<
  BrowserWindow,
  'isMinimized' | 'restore' | 'isVisible' | 'show' | 'focus'
>

/** Brings a window back to the user: restores it if minimized, shows it if hidden, then focuses it. */
export function revealWindow(window: RevealableWindow): void {
  if (window.isMinimized()) {
    window.restore()
  }
  if (!window.isVisible()) {
    window.show()
  }
  window.focus()
}
