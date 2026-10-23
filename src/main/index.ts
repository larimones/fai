import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  session,
  type Tray,
} from 'electron'
import { registerIpcHandlers } from './ipc/register-handlers'
import { createDesktopIntegration } from './os/desktop-integration'
import { createDataStore } from './persistence/data-store'
import { describeLoadProblem, flushBeforeQuit, needsInitialSave } from './persistence/startup'
import { createAppUrlMatcher } from './security/app-url'
import { hardenSession, hardenWebContents } from './security/harden'
import { createSenderGuard } from './security/sender-guard'
import { buildTrayMenu } from './tray/tray-menu'
import { createMainWindow } from './windows/main-window'
import { revealWindow, toggleWindow } from './windows/reveal-window'

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
  // Kept for the whole run: a garbage-collected Tray disappears from the system tray.
  let tray: Tray | undefined

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

  app.on('will-quit', () => {
    // Removes the icon right away instead of leaving a ghost until the user hovers the tray.
    tray?.destroy()
  })

  void app.whenReady().then(async () => {
    hardenSession(session.defaultSession)

    const dataFilePath = join(app.getPath('userData'), 'fai-data.json')
    const dataStore = createDataStore({
      filePath: dataFilePath,
      onError: (error) => {
        console.error('Fai: falha ao gravar os dados.', error)
      },
    })
    flushBeforeQuit(app, dataStore)
    const loaded = await dataStore.load()
    if (needsInitialSave(loaded)) {
      dataStore.save(loaded.data)
      void dataStore.flush()
    }

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
    const resourcesDir = join(app.getAppPath(), 'resources')
    const window = createMainWindow(rendererEntryUrl, {
      devTools: isDevelopment,
      icon: join(resourcesDir, 'app-icon.png'),
    })
    mainWindow = window
    const toggleFai = (): void => {
      toggleWindow(window)
    }
    const quit = (): void => {
      app.quit()
    }
    tray = createDesktopIntegration(process.platform).createTray({
      // nativeImage picks tray-icon@2x.png by itself on high-DPI screens.
      icon: nativeImage.createFromPath(join(resourcesDir, 'tray-icon.png')),
      tooltip: 'Fai',
      menu: Menu.buildFromTemplate(buildTrayMenu({ toggleFai, quit })),
      onActivate: toggleFai,
    })

    const notice = describeLoadProblem(loaded, dataFilePath)
    if (notice !== undefined) {
      console.warn(`Fai: ${notice.message}.`, loaded)
      // Not awaited: the app keeps starting while the warning is on screen.
      void dialog.showMessageBox({ type: 'warning', title: 'Fai', buttons: ['OK'], ...notice })
    }
  })
}
