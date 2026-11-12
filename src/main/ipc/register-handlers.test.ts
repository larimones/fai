import type { IpcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { IpcChannels } from '@shared/ipc/channels'
import type { SenderGuard } from './invoke-handler'
import {
  registerAppHandlers,
  registerMascotHandlers,
  registerTaskHandlers,
} from './register-handlers'

type Window = 'mascot' | 'panel'
type Listener = (event: IpcMainEvent, payload?: unknown) => void
type Handler = (event: IpcMainInvokeEvent, payload?: unknown) => Promise<unknown>

const ID = '6f1c2a4e-8b1d-4c3e-9f2a-1b2c3d4e5f60'
const TASK = {
  id: ID,
  title: 'Regar as plantas',
  createdAt: '2026-11-06T12:00:00.000Z',
  completedAt: null,
}

/** Each fake event says which window sent it; each guard accepts only its own. */
const from = (window: Window) => ({ window }) as unknown as IpcMainEvent & IpcMainInvokeEvent
const only =
  (...windows: Window[]): SenderGuard =>
  (event) =>
    windows.includes((event as unknown as { window: Window }).window)

function fakeIpcMain() {
  const listeners = new Map<string, Listener>()
  const handlers = new Map<string, Handler>()
  const ipcMain = {
    handle: vi.fn((channel: string, handler: Handler) => {
      handlers.set(channel, handler)
    }),
    on: vi.fn((channel: string, listener: Listener) => {
      listeners.set(channel, listener)
      return ipcMain
    }),
  }
  return {
    ipcMain: ipcMain as unknown as Pick<IpcMain, 'handle' | 'on'>,
    channels: () => [...handlers.keys(), ...listeners.keys()],
    send: (window: Window, channel: string, payload?: unknown) => {
      listeners.get(channel)?.(from(window), payload)
    },
    invoke: (window: Window, channel: string, payload?: unknown) =>
      handlers.get(channel)?.(from(window), payload),
  }
}

function setup() {
  const ipc = fakeIpcMain()
  const mascot = { setInteractive: vi.fn(), drag: vi.fn(), openMenu: vi.fn() }
  const tasks = {
    list: vi.fn(() => [TASK]),
    create: vi.fn(() => TASK),
    setDone: vi.fn(() => TASK),
    delete: vi.fn(),
  }
  registerAppHandlers(ipc.ipcMain, only('mascot', 'panel'), {
    getAppInfo: () => ({ name: 'Fai', version: '0.1.0', platform: 'linux' }),
  })
  registerMascotHandlers(ipc.ipcMain, only('mascot'), mascot)
  registerTaskHandlers(ipc.ipcMain, only('panel'), tasks)
  return { ...ipc, mascot, tasks }
}

describe('IPC registration (RNF-03, CA16)', () => {
  it('registers every declared channel', () => {
    const { channels } = setup()

    expect(channels().sort()).toEqual(
      [
        IpcChannels.appGetInfo,
        IpcChannels.tasksList,
        IpcChannels.tasksCreate,
        IpcChannels.tasksSetDone,
        IpcChannels.tasksDelete,
        IpcChannels.mascotSetInteractive,
        IpcChannels.mascotDrag,
        IpcChannels.mascotOpenMenu,
      ].sort(),
    )
  })

  it('routes mascot messages from the mascot window', () => {
    const { mascot, send } = setup()

    send('mascot', IpcChannels.mascotSetInteractive, { interactive: true })
    send('mascot', IpcChannels.mascotDrag, { phase: 'start' })
    send('mascot', IpcChannels.mascotOpenMenu)

    expect(mascot.setInteractive).toHaveBeenCalledExactlyOnceWith(true)
    expect(mascot.drag).toHaveBeenCalledExactlyOnceWith('start')
    expect(mascot.openMenu).toHaveBeenCalledOnce()
  })

  it('ignores mascot messages from the panel window', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { mascot, send } = setup()

    send('panel', IpcChannels.mascotSetInteractive, { interactive: true })
    send('panel', IpcChannels.mascotDrag, { phase: 'start' })
    send('panel', IpcChannels.mascotOpenMenu)

    expect(mascot.setInteractive).not.toHaveBeenCalled()
    expect(mascot.drag).not.toHaveBeenCalled()
    expect(mascot.openMenu).not.toHaveBeenCalled()
  })

  it('routes task requests from the panel window', async () => {
    const { tasks, invoke } = setup()

    await expect(invoke('panel', IpcChannels.tasksList)).resolves.toEqual({
      ok: true,
      value: [TASK],
    })
    await invoke('panel', IpcChannels.tasksCreate, { title: 'Regar as plantas' })
    await invoke('panel', IpcChannels.tasksSetDone, { id: ID, done: true })
    await expect(invoke('panel', IpcChannels.tasksDelete, { id: ID })).resolves.toEqual({
      ok: true,
      value: null,
    })

    expect(tasks.create).toHaveBeenCalledExactlyOnceWith('Regar as plantas')
    expect(tasks.setDone).toHaveBeenCalledExactlyOnceWith(ID, true)
    expect(tasks.delete).toHaveBeenCalledExactlyOnceWith(ID)
  })

  it('refuses task requests from the mascot window', async () => {
    const { tasks, invoke } = setup()

    await expect(invoke('mascot', IpcChannels.tasksList)).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNTRUSTED_SENDER' },
    })
    await invoke('mascot', IpcChannels.tasksDelete, { id: ID })

    expect(tasks.list).not.toHaveBeenCalled()
    expect(tasks.delete).not.toHaveBeenCalled()
  })

  it('answers the app info to both windows', async () => {
    const { invoke } = setup()

    for (const window of ['mascot', 'panel'] as const) {
      await expect(invoke(window, IpcChannels.appGetInfo)).resolves.toMatchObject({ ok: true })
    }
  })
})
