import type { BrowserWindow } from 'electron'

export type RevealableWindow = Pick<BrowserWindow, 'isVisible' | 'showInactive'>

export type ToggleableWindow = RevealableWindow & Pick<BrowserWindow, 'hide'>

/** Shows a hidden window without taking focus away from what the user is doing (RF-04 CA2). */
export function revealWindow(window: RevealableWindow): void {
  if (!window.isVisible()) {
    window.showInactive()
  }
}

/** Hides a window the user can see; otherwise brings it back. */
export function toggleWindow(window: ToggleableWindow): void {
  if (window.isVisible()) {
    window.hide()
  } else {
    revealWindow(window)
  }
}
