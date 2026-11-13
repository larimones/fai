import { join } from 'node:path'
import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron'
import type { Size } from '@domain/mascot/geometry'
import { secureWebPreferences } from './secure-web-preferences'

/** The task panel, in logical pixels (ADR-0014). */
/** 320×440 until the reminders form arrived (ADR-0016). */
export const PANEL_SIZE: Size = { width: 320, height: 520 }

/**
 * A small frameless window, see-through for its rounded corners, floating like Fai. Unlike the
 * mascot it takes focus, so the keyboard works and it can close itself when focus moves away.
 */
export function panelWindowOptions(
  preloadPath: string,
  options: { devTools: boolean },
): BrowserWindowConstructorOptions {
  return {
    ...PANEL_SIZE,
    useContentSize: true,
    title: 'Tarefas da Fai',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: secureWebPreferences(preloadPath, options),
  }
}

/** Created hidden at startup and reused: opening only moves and shows it. */
export function createPanelWindow(
  panelEntryUrl: string,
  options: { devTools: boolean },
): BrowserWindow {
  const window = new BrowserWindow(
    panelWindowOptions(join(__dirname, '..', 'preload', 'panel.js'), options),
  )
  window.setAlwaysOnTop(true, 'floating')
  void window.loadURL(panelEntryUrl)
  return window
}
