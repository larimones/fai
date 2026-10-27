import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  session,
  type Tray,
} from 'electron'
import type { FaiData } from '@domain/data/fai-data'
import { registerIpcHandlers } from './ipc/register-handlers'
import { createMascotController, initialMascotPosition } from './mascot/mascot-controller'
import { runWhenSettled } from './mascot/settle'
import { createDesktopIntegration } from './os/desktop-integration'
import { createDataStore } from './persistence/data-store'
import { describeLoadProblem, flushBeforeQuit, needsInitialSave } from './persistence/startup'
import { createAppUrlMatcher } from './security/app-url'
import { hardenSession, hardenWebContents } from './security/harden'
import { createSenderGuard } from './security/sender-guard'
import { buildTrayMenu } from './tray/tray-menu'
import { createMascotWindow } from './windows/mascot-window'
import { revealWindow, toggleWindow } from './windows/reveal-window'

/** How long monitors must stay unchanged before the mascot is brought back on screen. */
const DISPLAY_SETTLE_MS = 1000

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
  let mascotWindow: BrowserWindow | undefined
  // Kept for the whole run: a garbage-collected Tray disappears from the system tray.
  let tray: Tray | undefined

  app.enableSandbox()

  app.on('web-contents-created', (_event, contents) => {
    hardenWebContents(contents, isAppUrl)
  })

  app.on('second-instance', () => {
    if (mascotWindow !== undefined && !mascotWindow.isDestroyed()) {
      revealWindow(mascotWindow)
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
    // The app's copy of the document; every change goes through here and then to the store.
    let data: FaiData = loaded.data
    if (needsInitialSave(loaded)) {
      dataStore.save(data)
      void dataStore.flush()
    }

    const desktop = createDesktopIntegration(process.platform)
    const window = createMascotWindow(rendererEntryUrl, {
      position: initialMascotPosition(data.mascot.position, screen),
      devTools: isDevelopment,
    })
    mascotWindow = window
    const mascot = createMascotController({
      window,
      screen,
      setClickThrough: (enabled) => {
        desktop.setClickThrough(window, enabled)
      },
      savePosition: (position) => {
        data = { ...data, mascot: { ...data.mascot, position } }
        dataStore.save(data)
      },
    })
    const keepMascotOnScreen = runWhenSettled(() => {
      if (!window.isDestroyed()) {
        mascot.keepOnScreen()
      }
    }, DISPLAY_SETTLE_MS)
    screen.on('display-removed', keepMascotOnScreen)
    screen.on('display-metrics-changed', keepMascotOnScreen)

    registerIpcHandlers(
      ipcMain,
      createSenderGuard(isAppUrl, (sender) => BrowserWindow.fromWebContents(sender) !== null),
      {
        getAppInfo: () => ({
          name: app.getName(),
          version: app.getVersion(),
          platform: process.platform,
        }),
        mascot,
      },
    )
    const resourcesDir = join(app.getAppPath(), 'resources')
    const toggleFai = (): void => {
      toggleWindow(window)
    }
    const quit = (): void => {
      app.quit()
    }
    tray = desktop.createTray({
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
