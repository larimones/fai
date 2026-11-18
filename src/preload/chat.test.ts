import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatApi } from '@shared/ipc/api'

type Handler = (event: unknown, payload?: unknown) => void

const electron = vi.hoisted(() => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), send: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
}))

vi.mock('electron', () => electron)

describe('chat bubble preload (RNF-03, RF-19 CA2, ADR-0017)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function loadExposedApi(): Promise<ChatApi> {
    await import('./chat')
    expect(electron.contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1)
    const [key, api] = electron.contextBridge.exposeInMainWorld.mock.calls[0] as [string, ChatApi]
    expect(key).toBe('faiChat')
    return api
  }

  it('exposes exactly the chat functions, and nothing that reads the key back', async () => {
    const api = await loadExposedApi()

    expect(Object.keys(api)).toEqual([
      'send',
      'saveKey',
      'onOpened',
      'onPlaced',
      'onReplyDelta',
      'onReplyEnd',
      'onReplyError',
    ])
    expect(Object.values(api)).not.toContain(electron.ipcRenderer)
  })

  it('invokes each request channel with only its own payload', async () => {
    const api = await loadExposedApi()

    await api.send('oi, Fai')
    await api.saveKey('sk-ant-abc')

    expect(electron.ipcRenderer.invoke.mock.calls).toEqual([
      ['chat:send', { text: 'oi, Fai' }],
      ['chat:save-key', { key: 'sk-ant-abc' }],
    ])
    expect(electron.ipcRenderer.send).not.toHaveBeenCalled()
  })

  it('passes each event on without the Electron event, drops bad payloads, and can stop', async () => {
    const api = await loadExposedApi()
    const opened = vi.fn()
    const placed = vi.fn()
    const delta = vi.fn()
    const end = vi.fn()
    const failed = vi.fn()

    const stops = [
      api.onOpened(opened),
      api.onPlaced(placed),
      api.onReplyDelta(delta),
      api.onReplyEnd(end),
      api.onReplyError(failed),
    ]
    const handlers = new Map(
      (electron.ipcRenderer.on.mock.calls as [string, Handler][]).map(([channel, handler]) => [
        channel,
        handler,
      ]),
    )
    const emit = (channel: string, payload?: unknown) => {
      handlers.get(channel)?.({ sender: 'secret' }, payload)
    }

    emit('chat:opened', { mode: 'key', hasKey: false, keyPersists: true })
    emit('chat:opened', { mode: 'key' })
    emit('chat:placed', { tail: 'down', tailAt: 150 })
    emit('chat:reply-delta', { text: 'Oi!' })
    emit('chat:reply-delta', 'Oi!')
    emit('chat:reply-end')
    emit('chat:reply-end', { extra: true })
    emit('chat:reply-error', { message: 'Sem conexão.', text: 'oi' })

    expect(opened).toHaveBeenCalledExactlyOnceWith({
      mode: 'key',
      hasKey: false,
      keyPersists: true,
    })
    expect(placed).toHaveBeenCalledExactlyOnceWith({ tail: 'down', tailAt: 150 })
    expect(delta).toHaveBeenCalledExactlyOnceWith('Oi!')
    expect(end).toHaveBeenCalledExactlyOnceWith()
    expect(failed).toHaveBeenCalledExactlyOnceWith({ message: 'Sem conexão.', text: 'oi' })

    for (const stop of stops) {
      stop()
    }
    expect(electron.ipcRenderer.removeListener).toHaveBeenCalledTimes(5)
    for (const [channel, handler] of handlers) {
      expect(electron.ipcRenderer.removeListener).toHaveBeenCalledWith(channel, handler)
    }
  })
})
