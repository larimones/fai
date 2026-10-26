import { join } from 'node:path'
import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron'
import type { ScreenPoint } from '@domain/data/fai-data'
import { MASCOT_WINDOW_SIZE } from '@domain/mascot/dimensions'
import { secureWebPreferences } from './secure-web-preferences'

/** A small, frameless, see-through window that floats above the others without taking focus (ADR-0004). */
export function mascotWindowOptions(
  position: ScreenPoint,
  preloadPath: string,
  options: { devTools: boolean },
): BrowserWindowConstructorOptions {
  return {
    ...position,
    ...MASCOT_WINDOW_SIZE,
    useContentSize: true,
    title: 'Fai',
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    // Never steals focus; also keeps the window out of Alt+Tab on Windows (RF-04 CA2).
    focusable: false,
    show: false,
    webPreferences: secureWebPreferences(preloadPath, options),
  }
}

export function createMascotWindow(
  rendererEntryUrl: string,
  options: { position: ScreenPoint; devTools: boolean },
): BrowserWindow {
  const window = new BrowserWindow(
    mascotWindowOptions(options.position, join(__dirname, '..', 'preload', 'mascot.js'), {
      devTools: options.devTools,
    }),
  )
  // 'floating' keeps the mascot above normal windows without covering menus and tooltips.
  window.setAlwaysOnTop(true, 'floating')
  window.once('ready-to-show', () => {
    window.showInactive()
  })
  void window.loadURL(rendererEntryUrl)
  return window
}
