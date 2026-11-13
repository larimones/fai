import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PanelApi } from '@shared/ipc/api'

type Handler = (event: unknown, payload?: unknown) => void

const electron = vi.hoisted(() => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), send: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
}))

vi.mock('electron', () => electron)

const ID = '6f1c2a4e-8b1d-4c3e-9f2a-1b2c3d4e5f60'

describe('panel window preload (RNF-03, ADR-0014)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function loadExposedApi(): Promise<PanelApi> {
    await import('./panel')
    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
    const [key, api] = electron.contextBridge.exposeInMainWorld.mock.calls[0] as [string, PanelApi]
    expect(key).toBe('faiPanel')
    return api
  }

  it('exposes exactly the task functions and the opened event', async () => {
    const api = await loadExposedApi()

    expect(Object.keys(api)).toEqual(['tasks', 'onOpened'])
    expect(Object.keys(api.tasks)).toEqual(['list', 'create', 'setDone', 'delete'])
    expect(Object.values(api)).not.toContain(electron.ipcRenderer)
  })

  it('invokes each task channel with only its own payload', async () => {
    const api = await loadExposedApi()

    await api.tasks.list()
    await api.tasks.create('Regar')
    await api.tasks.setDone(ID, true)
    await api.tasks.delete(ID)

    expect(electron.ipcRenderer.invoke.mock.calls).toEqual([
      ['tasks:list'],
      ['tasks:create', { title: 'Regar' }],
      ['tasks:set-done', { id: ID, done: true }],
      ['tasks:delete', { id: ID }],
    ])
    expect(electron.ipcRenderer.send).not.toHaveBeenCalled()
  })

  it('calls the opened listener without the Electron event, and can stop listening', async () => {
    const api = await loadExposedApi()
    const listener = vi.fn()

    const stop = api.onOpened(listener)
    const [channel, handler] = electron.ipcRenderer.on.mock.calls[0] as [string, Handler]
    handler({ sender: 'secret' }, { tab: 'reminders' })

    expect(channel).toBe('panel:opened')
    expect(listener).toHaveBeenCalledExactlyOnceWith('reminders')

    stop()
    expect(electron.ipcRenderer.removeListener).toHaveBeenCalledExactlyOnceWith(
      'panel:opened',
      handler,
    )
  })

  it('ignores an opened event that carries an unexpected payload', async () => {
    const api = await loadExposedApi()
    const listener = vi.fn()

    api.onOpened(listener)
    const [, handler] = electron.ipcRenderer.on.mock.calls[0] as [string, Handler]
    handler({}, { surprise: true })

    expect(listener).not.toHaveBeenCalled()
  })
})
