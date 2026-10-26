import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FaiApi } from '@shared/ipc/api'

const electron = vi.hoisted(() => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), send: vi.fn(), on: vi.fn() },
}))

vi.mock('electron', () => electron)

describe('mascot window preload (RNF-03)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function loadExposedApi(): Promise<Record<string, unknown>> {
    await import('./mascot')
    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
    const [key, api] = electron.contextBridge.exposeInMainWorld.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(key).toBe('fai')
    return api
  }

  it('exposes exactly the declared API and nothing else', async () => {
    const api = await loadExposedApi()

    expect(Object.keys(api)).toEqual(['app', 'mascot'])
    expect(Object.keys(api['app'] as object)).toEqual(['getInfo'])
    expect(Object.keys(api['mascot'] as object)).toEqual(['setInteractive', 'drag'])
    expect(Object.values(api)).not.toContain(electron.ipcRenderer)
  })

  it('app.getInfo invokes only the app:get-info channel, without arguments', async () => {
    electron.ipcRenderer.invoke.mockResolvedValue({
      ok: true,
      value: { name: 'Fai', version: '0.1.0', platform: 'linux' },
    })
    const api = (await loadExposedApi()) as unknown as FaiApi

    await expect(api.app.getInfo()).resolves.toEqual({
      ok: true,
      value: { name: 'Fai', version: '0.1.0', platform: 'linux' },
    })
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledExactlyOnceWith('app:get-info')
    expect(electron.ipcRenderer.send).not.toHaveBeenCalled()
  })

  it('mascot.setInteractive sends only on mascot:set-interactive', async () => {
    const api = (await loadExposedApi()) as unknown as FaiApi

    api.mascot.setInteractive(true)

    expect(electron.ipcRenderer.send).toHaveBeenCalledExactlyOnceWith('mascot:set-interactive', {
      interactive: true,
    })
    expect(electron.ipcRenderer.invoke).not.toHaveBeenCalled()
  })

  it('mascot.drag sends only the phase on mascot:drag', async () => {
    const api = (await loadExposedApi()) as unknown as FaiApi

    api.mascot.drag('move')

    expect(electron.ipcRenderer.send).toHaveBeenCalledExactlyOnceWith('mascot:drag', {
      phase: 'move',
    })
    expect(electron.ipcRenderer.invoke).not.toHaveBeenCalled()
  })
})
