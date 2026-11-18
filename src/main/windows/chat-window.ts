import { join } from 'node:path'
import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron'
import type { Size } from '@domain/mascot/geometry'
import { secureWebPreferences } from './secure-web-preferences'

/** The chat bubble, tail included, in logical pixels (ADR-0017). */
export const CHAT_SIZE: Size = { width: 300, height: 380 }

/** Like the panel: frameless, see-through for the bubble shape and its tail, and it takes focus. */
export function chatWindowOptions(
  preloadPath: string,
  options: { devTools: boolean },
): BrowserWindowConstructorOptions {
  return {
    ...CHAT_SIZE,
    useContentSize: true,
    title: 'Conversa com a Fai',
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
export function createChatWindow(
  chatEntryUrl: string,
  options: { devTools: boolean },
): BrowserWindow {
  const window = new BrowserWindow(
    chatWindowOptions(join(__dirname, '..', 'preload', 'chat.js'), options),
  )
  window.setAlwaysOnTop(true, 'floating')
  void window.loadURL(chatEntryUrl)
  return window
}
