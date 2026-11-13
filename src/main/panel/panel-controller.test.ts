import { describe, expect, it, vi } from 'vitest'
import { PANEL_GAP_PX } from '@domain/panel/placement'
import { IpcChannels } from '@shared/ipc/channels'
import { createPanelController } from './panel-controller'

const WORK_AREA = { x: 0, y: 0, width: 1920, height: 1040 }
const PANEL = { width: 320, height: 440 }
const FAI_SIZE = { width: 188, height: 160 }

type Listener = (...args: never[]) => void

function fakePanelWindow() {
  const listeners = new Map<string, Listener>()
  const contentsListeners = new Map<string, Listener>()
  let visible = false
  const window = {
    isVisible: vi.fn(() => visible),
    setPosition: vi.fn(),
    show: vi.fn(() => {
      visible = true
    }),
    focus: vi.fn(),
    hide: vi.fn(() => {
      visible = false
    }),
    on: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, listener)
    }),
    webContents: {
      on: vi.fn((event: string, listener: Listener) => {
        contentsListeners.set(event, listener)
      }),
      send: vi.fn(),
    },
  }
  const emit = (event: string): void => {
    ;(listeners.get(event) as (() => void) | undefined)?.()
  }
  const press = (key: string, type = 'keyDown') => {
    const event = { preventDefault: vi.fn() }
    ;(
      contentsListeners.get('before-input-event') as
        ((e: typeof event, input: { key: string; type: string }) => void) | undefined
    )?.(event, { key, type })
    return event
  }
  return { window, emit, press }
}

function setup(fai = { x: 1716, y: 864 }) {
  const fake = fakePanelWindow()
  const controller = createPanelController({
    window: fake.window,
    size: PANEL,
    mascotSize: FAI_SIZE,
    getMascotPosition: () => fai,
    workAreaFor: () => WORK_AREA,
  })
  return { ...fake, controller }
}

describe('panel controller (CA3, CA4, ADR-0014)', () => {
  it('opens next to Fai, focused, and tells the page it was opened', () => {
    const { window, controller } = setup()

    controller.open()

    expect(window.setPosition).toHaveBeenCalledExactlyOnceWith(
      1716 - PANEL_GAP_PX - 320,
      864 + 160 - 440,
    )
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
    expect(window.webContents.send).toHaveBeenCalledExactlyOnceWith(IpcChannels.panelOpened, {
      tab: 'tasks',
    })
    expect(window.setPosition.mock.invocationCallOrder[0]).toBeLessThan(
      window.show.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('opening again while open only focuses it and tells the page again', () => {
    const { window, controller } = setup()

    controller.open()
    controller.open()

    expect(window.show).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledTimes(2)
    expect(window.webContents.send).toHaveBeenCalledTimes(2)
  })

  it('hides when it loses focus', () => {
    const { window, controller, emit } = setup()
    controller.open()

    emit('blur')

    expect(window.hide).toHaveBeenCalledOnce()
  })

  it('hides on Escape, and only on Escape key presses', () => {
    const { window, controller, press } = setup()
    controller.open()

    press('a')
    press('Escape', 'keyUp')
    expect(window.hide).not.toHaveBeenCalled()

    const escape = press('Escape')
    expect(window.hide).toHaveBeenCalledOnce()
    expect(escape.preventDefault).toHaveBeenCalledOnce()
  })

  it('follows Fai while open, to the position she was just moved to', () => {
    const { window, controller } = setup()
    controller.open()
    window.setPosition.mockClear()

    controller.follow({ x: 1500, y: 600 })

    expect(window.setPosition).toHaveBeenCalledExactlyOnceWith(1500 - PANEL_GAP_PX - 320, 320)
  })

  it('does not move while hidden', () => {
    const { window, controller } = setup()

    controller.follow({ x: 1500, y: 600 })

    expect(window.setPosition).not.toHaveBeenCalled()
  })
})
