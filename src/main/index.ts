import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { registerIpcHandlers } from './ipc/register-handlers'
import { createAppUrlMatcher } from './security/app-url'
import { hardenSession, hardenWebContents } from './security/harden'
import { createSenderGuard } from './security/sender-guard'
import { createMainWindow } from './windows/main-window'
import { revealWindow } from './windows/reveal-window'

// Must run before anything else: a second launch only wakes up the running instance (RF-02).
if (app.requestSingleInstanceLock()) {
  startApp()
} else {
  app.quit()
}

function startApp(): void {
  const isDevelopment = !app.isPackaged
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  const rendererEntryUrl =
    isDevelopment && devServerUrl !== undefined
      ? devServerUrl
      : pathToFileURL(join(__dirname, '..', 'renderer', 'index.html')).href
  const isAppUrl = createAppUrlMatcher(rendererEntryUrl)
  // The main window stands in for the mascot window until Stage 3.
  let mainWindow: BrowserWindow | undefined

  app.enableSandbox()

  app.on('web-contents-created', (_event, contents) => {
    hardenWebContents(contents, isAppUrl)
  })

  app.on('second-instance', () => {
    if (mainWindow !== undefined && !mainWindow.isDestroyed()) {
      revealWindow(mainWindow)
    }
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  void app.whenReady().then(() => {
    hardenSession(session.defaultSession)
    registerIpcHandlers(
      ipcMain,
      createSenderGuard(isAppUrl, (sender) => BrowserWindow.fromWebContents(sender) !== null),
      {
        getAppInfo: () => ({
          name: app.getName(),
          version: app.getVersion(),
          platform: process.platform,
        }),
      },
    )
    mainWindow = createMainWindow(rendererEntryUrl, { devTools: isDevelopment })
  })
}
