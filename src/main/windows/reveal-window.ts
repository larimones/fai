import type { BrowserWindow } from 'electron'

export type RevealableWindow = Pick<
  BrowserWindow,
  'isMinimized' | 'restore' | 'isVisible' | 'show' | 'focus'
>

export type ToggleableWindow = RevealableWindow & Pick<BrowserWindow, 'hide'>

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

/** Hides a window the user can see; otherwise brings it back. */
export function toggleWindow(window: ToggleableWindow): void {
  if (window.isVisible() && !window.isMinimized()) {
    window.hide()
  } else {
    revealWindow(window)
  }
}
