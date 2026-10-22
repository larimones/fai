import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { registerIpcHandlers } from './ipc/register-handlers'
import { createAppUrlMatcher } from './security/app-url'
import { hardenSession, hardenWebContents } from './security/harden'
import { createSenderGuard } from './security/sender-guard'
import { createMainWindow } from './windows/main-window'

const isDevelopment = !app.isPackaged
const devServerUrl = process.env['ELECTRON_RENDERER_URL']
const rendererEntryUrl =
  isDevelopment && devServerUrl !== undefined
    ? devServerUrl
    : pathToFileURL(join(__dirname, '..', 'renderer', 'index.html')).href
const isAppUrl = createAppUrlMatcher(rendererEntryUrl)

app.enableSandbox()

app.on('web-contents-created', (_event, contents) => {
  hardenWebContents(contents, isAppUrl)
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
  createMainWindow(rendererEntryUrl, { devTools: isDevelopment })
})
