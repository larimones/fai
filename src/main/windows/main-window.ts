import { join } from 'node:path'
import { BrowserWindow } from 'electron'
import { secureWebPreferences } from './secure-web-preferences'

export function createMainWindow(
  rendererEntryUrl: string,
  options: { devTools: boolean; icon: string },
): BrowserWindow {
  const window = new BrowserWindow({
    width: 480,
    height: 320,
    title: 'Fai',
    icon: options.icon,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#141432',
    webPreferences: secureWebPreferences(join(__dirname, '..', 'preload', 'main.js'), {
      devTools: options.devTools,
    }),
  })
  window.once('ready-to-show', () => {
    window.show()
  })
  void window.loadURL(rendererEntryUrl)
  return window
}
