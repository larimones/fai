import type { BrowserWindow, Menu, NativeImage } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDesktopIntegration, type TrayOptions } from './desktop-integration'

const electron = vi.hoisted(() => {
  class FakeTray {
    static instances: FakeTray[] = []
    readonly setToolTip = vi.fn()
    readonly setContextMenu = vi.fn()
    readonly on = vi.fn()

    constructor(readonly icon: unknown) {
      FakeTray.instances.push(this)
    }
  }
  class FakeNotification {
    static instances: FakeNotification[] = []
    readonly listeners = new Map<string, (...args: unknown[]) => void>()
    readonly show = vi.fn()
    readonly on = vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      this.listeners.set(event, listener)
      return this
    })

    constructor(readonly options: { title: string; body: string }) {
      FakeNotification.instances.push(this)
    }

    emit(event: string, ...args: unknown[]): void {
      this.listeners.get(event)?.(...args)
    }
  }
  return { Tray: FakeTray, Notification: FakeNotification, app: { setAppUserModelId: vi.fn() } }
})

vi.mock('electron', () => electron)

function trayOptions(): TrayOptions {
  return {
    icon: { kind: 'icon' } as unknown as NativeImage,
    tooltip: 'Fai',
    menu: { kind: 'menu' } as unknown as Menu,
    onActivate: vi.fn(),
  }
}

function lastTray() {
  const tray = electron.Tray.instances.at(-1)
  if (tray === undefined) {
    throw new Error('no tray created')
  }
  return tray
}

describe('createDesktopIntegration (RNF-05 CA2)', () => {
  beforeEach(() => {
    electron.Tray.instances = []
  })

  it('rejects platforms the app does not support', () => {
    expect(() => createDesktopIntegration('darwin')).toThrow('Plataforma não suportada: darwin')
  })

  it('on Windows, the tray has the menu and a left click activates', () => {
    const options = trayOptions()

    const tray = createDesktopIntegration('win32').createTray(options)

    expect(tray).toBe(lastTray())
    expect(lastTray().icon).toBe(options.icon)
    expect(lastTray().setToolTip).toHaveBeenCalledExactlyOnceWith('Fai')
    expect(lastTray().setContextMenu).toHaveBeenCalledExactlyOnceWith(options.menu)
    expect(lastTray().on).toHaveBeenCalledExactlyOnceWith('click', options.onActivate)
  })

  it('on Linux, the tray relies on the menu alone', () => {
    const options = trayOptions()

    createDesktopIntegration('linux').createTray(options)

    expect(lastTray().icon).toBe(options.icon)
    expect(lastTray().setToolTip).toHaveBeenCalledExactlyOnceWith('Fai')
    expect(lastTray().setContextMenu).toHaveBeenCalledExactlyOnceWith(options.menu)
    expect(lastTray().on).not.toHaveBeenCalled()
  })
})

describe('setClickThrough (RF-05)', () => {
  function fakeWindow() {
    return { setIgnoreMouseEvents: vi.fn() } satisfies Pick<BrowserWindow, 'setIgnoreMouseEvents'>
  }

  it('on Windows, ignores clicks but keeps forwarding mouse moves', () => {
    const window = fakeWindow()
    const integration = createDesktopIntegration('win32')

    integration.setClickThrough(window, true)
    integration.setClickThrough(window, false)

    expect(window.setIgnoreMouseEvents.mock.calls).toEqual([[true, { forward: true }], [false]])
  })

  it('on Linux, leaves the window receiving clicks', () => {
    const window = fakeWindow()
    const integration = createDesktopIntegration('linux')

    integration.setClickThrough(window, true)
    integration.setClickThrough(window, false)

    expect(window.setIgnoreMouseEvents).not.toHaveBeenCalled()
  })
})

describe('notifications (RF-15, ADR-0016)', () => {
  beforeEach(() => {
    electron.Notification.instances = []
    electron.app.setAppUserModelId.mockClear()
  })

  const lastNotification = () => {
    const notification = electron.Notification.instances.at(-1)
    if (notification === undefined) {
      throw new Error('no notification created')
    }
    return notification
  }

  it('on Windows, prepares the app id the installer will use', () => {
    createDesktopIntegration('win32').prepareNotifications()

    expect(electron.app.setAppUserModelId).toHaveBeenCalledExactlyOnceWith(
      'io.github.larimones.fai',
    )
  })

  it('on Linux, needs no preparation', () => {
    createDesktopIntegration('linux').prepareNotifications()

    expect(electron.app.setAppUserModelId).not.toHaveBeenCalled()
  })

  for (const platform of ['win32', 'linux'] as const) {
    it(`on ${platform}, shows the title and text and calls back on click`, () => {
      const onClick = vi.fn()

      createDesktopIntegration(platform).notify({ title: 'Fai ✨', body: 'tomar água', onClick })
      const notification = lastNotification()
      notification.emit('click')

      expect(notification.options).toEqual({ title: 'Fai ✨', body: 'tomar água' })
      expect(notification.show).toHaveBeenCalledOnce()
      expect(onClick).toHaveBeenCalledOnce()
    })
  }

  it('keeps each notification alive until it closes, so its click still works', () => {
    const integration = createDesktopIntegration('linux')

    integration.notify({ title: 'Fai ✨', body: 'a', onClick: vi.fn() })
    integration.notify({ title: 'Fai ✨', body: 'b', onClick: vi.fn() })
    expect(integration.openNotifications()).toBe(2)

    electron.Notification.instances[0]?.emit('close')
    expect(integration.openNotifications()).toBe(1)
  })

  it('logs a notification that failed to show and lets it go', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const integration = createDesktopIntegration('win32')

    integration.notify({ title: 'Fai ✨', body: 'a', onClick: vi.fn() })
    lastNotification().emit('failed', {}, 'toast falhou')

    expect(error).toHaveBeenCalled()
    expect(integration.openNotifications()).toBe(0)
    error.mockRestore()
  })
})
