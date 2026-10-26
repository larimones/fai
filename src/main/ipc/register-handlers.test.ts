import type { IpcMain, IpcMainEvent } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { IpcChannels } from '@shared/ipc/channels'
import { registerIpcHandlers } from './register-handlers'

type Listener = (event: IpcMainEvent, payload?: unknown) => void

function setup() {
  const listeners = new Map<string, Listener>()
  const ipcMain = {
    handle: vi.fn<(channel: string, handler: unknown) => void>(),
    on: vi.fn((channel: string, listener: Listener) => {
      listeners.set(channel, listener)
      return ipcMain
    }),
  }
  const mascot = { setInteractive: vi.fn(), drag: vi.fn() }
  registerIpcHandlers(ipcMain as unknown as Pick<IpcMain, 'handle' | 'on'>, () => true, {
    getAppInfo: () => ({ name: 'Fai', version: '0.1.0', platform: 'linux' }),
    mascot,
  })
  const send = (channel: string, payload: unknown): void => {
    listeners.get(channel)?.({} as IpcMainEvent, payload)
  }
  return { ipcMain, mascot, send }
}

describe('registerIpcHandlers (RNF-03)', () => {
  it('registers every declared channel and nothing else', () => {
    const { ipcMain } = setup()

    expect(ipcMain.handle.mock.calls.map(([channel]) => channel)).toEqual([IpcChannels.appGetInfo])
    expect(ipcMain.on.mock.calls.map(([channel]) => channel)).toEqual([
      IpcChannels.mascotSetInteractive,
      IpcChannels.mascotDrag,
    ])
  })

  it('routes mascot messages to the mascot', () => {
    const { mascot, send } = setup()

    send(IpcChannels.mascotSetInteractive, { interactive: true })
    send(IpcChannels.mascotDrag, { phase: 'start' })

    expect(mascot.setInteractive).toHaveBeenCalledExactlyOnceWith(true)
    expect(mascot.drag).toHaveBeenCalledExactlyOnceWith('start')
  })
})
