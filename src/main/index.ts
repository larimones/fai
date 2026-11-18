import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  powerMonitor,
  screen,
  session,
  type Tray,
} from 'electron'
import type { FaiData } from '@domain/data/fai-data'
import { MASCOT_WINDOW_SIZE } from '@domain/mascot/dimensions'
import type { ChatReplyError, MascotReaction } from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'
import { createApiKeyStore } from './chat/api-key-store'
import { createChatController } from './chat/chat-controller'
import { createChatService } from './chat/chat-service'
import { createClaudeChat } from './chat/claude-chat'
import {
  registerAppHandlers,
  registerChatHandlers,
  registerMascotHandlers,
  registerReminderHandlers,
  registerTaskHandlers,
} from './ipc/register-handlers'
import { createMascotController, initialMascotPosition } from './mascot/mascot-controller'
import { buildMascotMenu } from './mascot/mascot-menu'
import { runWhenSettled } from './mascot/settle'
import { createDesktopIntegration } from './os/desktop-integration'
import { createDataStore } from './persistence/data-store'
import { describeLoadProblem, flushBeforeQuit, needsInitialSave } from './persistence/startup'
import { createAppUrlMatcher } from './security/app-url'
import { hardenSession, hardenWebContents } from './security/harden'
import { createSenderGuard } from './security/sender-guard'
import { createPanelController } from './panel/panel-controller'
import { createReminderService } from './reminders/reminder-service'
import { createReminderScheduler } from './reminders/scheduler'
import { createTaskService } from './tasks/task-service'
import { buildTrayMenu } from './tray/tray-menu'
import { CHAT_SIZE, createChatWindow } from './windows/chat-window'
import { createMascotWindow } from './windows/mascot-window'
import { createPanelWindow, PANEL_SIZE } from './windows/panel-window'
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
  const panelEntryUrl =
    isDevelopment && devServerUrl !== undefined
      ? new URL('panel.html', devServerUrl.endsWith('/') ? devServerUrl : `${devServerUrl}/`).href
      : pathToFileURL(join(__dirname, '..', 'renderer', 'panel.html')).href
  const chatEntryUrl =
    isDevelopment && devServerUrl !== undefined
      ? new URL('chat.html', devServerUrl.endsWith('/') ? devServerUrl : `${devServerUrl}/`).href
      : pathToFileURL(join(__dirname, '..', 'renderer', 'chat.html')).href
  const isAppUrl = createAppUrlMatcher([rendererEntryUrl, panelEntryUrl, chatEntryUrl])
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
    // Before the first notification, so Windows shows it under Fai's name (ADR-0016).
    desktop.prepareNotifications()
    const window = createMascotWindow(rendererEntryUrl, {
      position: initialMascotPosition(data.mascot.position, screen),
      devTools: isDevelopment,
    })
    mascotWindow = window
    const panelWindow = createPanelWindow(panelEntryUrl, { devTools: isDevelopment })
    const chatWindow = createChatWindow(chatEntryUrl, { devTools: isDevelopment })
    // The AI key, encrypted by the OS in its own file, never in fai-data.json (ADR-0017).
    const apiKeys = createApiKeyStore({
      filePath: join(app.getPath('userData'), 'fai-ai-key.bin'),
      storage: desktop.secretStorage(),
    })
    await apiKeys.load()
    const chatService = createChatService({
      keys: apiKeys,
      makeModel: (apiKey) => createClaudeChat(apiKey),
      bubble: {
        delta: (text) => {
          chatWindow.webContents.send(IpcChannels.chatReplyDelta, { text })
        },
        end: () => {
          chatWindow.webContents.send(IpcChannels.chatReplyEnd)
        },
        error: (failure) => {
          chatWindow.webContents.send(IpcChannels.chatReplyError, failure satisfies ChatReplyError)
        },
      },
      react: () => {
        window.webContents.send(IpcChannels.mascotReaction, {
          kind: 'reply',
        } satisfies MascotReaction)
      },
    })
    const panel = createPanelController({
      window: panelWindow,
      size: PANEL_SIZE,
      mascotSize: MASCOT_WINDOW_SIZE,
      getMascotPosition: () => {
        const [x = 0, y = 0] = window.getPosition()
        return { x, y }
      },
      workAreaFor: (rectangle) => screen.getDisplayMatching(rectangle).workArea,
    })
    const chat = createChatController({
      window: chatWindow,
      size: CHAT_SIZE,
      mascotSize: MASCOT_WINDOW_SIZE,
      getMascotPosition: () => {
        const [x = 0, y = 0] = window.getPosition()
        return { x, y }
      },
      workAreaFor: (rectangle) => screen.getDisplayMatching(rectangle).workArea,
      status: () => chatService.status(),
      // One floating window at a time: the panel steps aside for the bubble, and vice versa.
      onOpen: () => {
        panel.hide()
      },
      onClose: () => {
        chatService.close()
      },
    })
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
      onMoved: (position) => {
        panel.follow(position)
        chat.follow(position)
      },
    })
    const keepMascotOnScreen = runWhenSettled(() => {
      if (!window.isDestroyed()) {
        mascot.keepOnScreen()
      }
    }, DISPLAY_SETTLE_MS)
    screen.on('display-removed', keepMascotOnScreen)
    screen.on('display-metrics-changed', keepMascotOnScreen)

    // Each channel only accepts the window that owns it (ADR-0014).
    const isMascotWindow = createSenderGuard(isAppUrl, (sender) => sender === window.webContents)
    const isPanelWindow = createSenderGuard(
      isAppUrl,
      (sender) => sender === panelWindow.webContents,
    )
    const isChatWindow = createSenderGuard(isAppUrl, (sender) => sender === chatWindow.webContents)
    const isAppWindow = createSenderGuard(
      isAppUrl,
      (sender) => sender === window.webContents || sender === panelWindow.webContents,
    )
    registerAppHandlers(ipcMain, isAppWindow, {
      getAppInfo: () => ({
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
      }),
    })
    // The menu and the tray open the tasks tab; a reminder notification, the reminders tab.
    const openPanel = (): void => {
      chat.hide()
      panel.open('tasks')
    }
    const openChat = (): void => {
      chat.open('chat')
    }
    const mascotMenu = Menu.buildFromTemplate(buildMascotMenu({ openPanel, openChat }))
    registerMascotHandlers(ipcMain, isMascotWindow, {
      setInteractive: (interactive) => {
        mascot.setInteractive(interactive)
      },
      drag: (phase) => {
        mascot.drag(phase)
      },
      openMenu: () => {
        mascotMenu.popup({ window })
      },
    })
    registerTaskHandlers(
      ipcMain,
      isPanelWindow,
      createTaskService({
        store: {
          read: () => data.tasks,
          write: (tasks) => {
            data = { ...data, tasks }
            dataStore.save(data)
          },
        },
        newId: () => randomUUID(),
        now: () => new Date().toISOString(),
        celebrate: () => {
          window.webContents.send(IpcChannels.mascotReaction, {
            kind: 'celebrate',
          } satisfies MascotReaction)
        },
      }),
    )
    const now = (): string => new Date().toISOString()
    const reminderStore = {
      read: () => data.reminders,
      write: (reminders: FaiData['reminders']) => {
        data = { ...data, reminders }
        dataStore.save(data)
      },
    }
    const scheduler = createReminderScheduler({
      store: reminderStore,
      now,
      notify: ({ title, body }) => {
        desktop.notify({
          title,
          body,
          onClick: () => {
            chat.hide()
            panel.open('reminders')
          },
        })
      },
      react: () => {
        window.webContents.send(IpcChannels.mascotReaction, {
          kind: 'reminder',
        } satisfies MascotReaction)
      },
      changed: () => {
        panelWindow.webContents.send(IpcChannels.remindersChanged)
      },
    })
    registerReminderHandlers(
      ipcMain,
      isPanelWindow,
      createReminderService({
        store: reminderStore,
        newId: () => randomUUID(),
        now,
        onCreated: () => {
          scheduler.check()
        },
      }),
    )
    registerChatHandlers(ipcMain, isChatWindow, chatService)
    const changeKey = (): void => {
      chat.open('key')
    }
    const clearKey = (): void => {
      void dialog
        .showMessageBox({
          type: 'question',
          title: 'Fai',
          message: 'Apagar a chave da IA?',
          detail: 'Para conversar com a Fai de novo, será preciso colar a chave outra vez.',
          buttons: ['Apagar', 'Cancelar'],
          defaultId: 1,
          cancelId: 1,
        })
        .then(async ({ response }) => {
          if (response === 0) {
            chat.hide()
            await chatService.clearKey()
          }
        })
    }
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
      menu: Menu.buildFromTemplate(
        buildTrayMenu({ toggleFai, openPanel, openChat, changeKey, clearKey, quit }),
      ),
      onActivate: toggleFai,
    })

    // Reminders missed while the app was closed are announced now, marked late (RF-16).
    // The first check waits for Fai's page, or her reaction would be lost.
    window.webContents.once('did-finish-load', () => {
      scheduler.check()
    })
    const stopScheduler = scheduler.start()
    app.on('will-quit', stopScheduler)
    // After sleep, the interval may not have run for hours (ADR-0006).
    powerMonitor.on('resume', () => {
      scheduler.check()
    })

    const notice = describeLoadProblem(loaded, dataFilePath)
    if (notice !== undefined) {
      console.warn(`Fai: ${notice.message}.`, loaded)
      // Not awaited: the app keeps starting while the warning is on screen.
      void dialog.showMessageBox({ type: 'warning', title: 'Fai', buttons: ['OK'], ...notice })
    }
  })
}
