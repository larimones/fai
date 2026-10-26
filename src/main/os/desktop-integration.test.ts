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
  return { Tray: FakeTray }
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
