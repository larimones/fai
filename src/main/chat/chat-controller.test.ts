import { describe, expect, it, vi } from 'vitest'
import { BUBBLE_GAP_PX } from '@domain/chat/bubble-placement'
import { IpcChannels } from '@shared/ipc/channels'
import { createChatController } from './chat-controller'

const WORK_AREA = { x: 0, y: 0, width: 1920, height: 1040 }
const BUBBLE = { width: 300, height: 380 }
const FAI_SIZE = { width: 188, height: 160 }

type Listener = (...args: never[]) => void

function fakeWindow() {
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

function setup(status = { hasKey: true, keyPersists: true }) {
  const fake = fakeWindow()
  const onOpen = vi.fn()
  const onClose = vi.fn()
  const controller = createChatController({
    window: fake.window,
    size: BUBBLE,
    mascotSize: FAI_SIZE,
    getMascotPosition: () => ({ x: 800, y: 600 }),
    workAreaFor: () => WORK_AREA,
    status: () => status,
    onOpen,
    onClose,
  })
  return { ...fake, controller, onOpen, onClose }
}

describe('chat controller (CA1, CA4, ADR-0017)', () => {
  it('opens above Fai, focused, and tells the bubble its tail and what to show', () => {
    const { window, controller, onOpen } = setup()

    controller.open('chat')

    expect(onOpen).toHaveBeenCalledOnce()
    expect(window.setPosition).toHaveBeenCalledExactlyOnceWith(
      800 + 94 - 150,
      600 - BUBBLE_GAP_PX - 380,
    )
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
    expect(window.webContents.send.mock.calls).toEqual([
      [IpcChannels.chatPlaced, { tail: 'down', tailAt: 150 }],
      [IpcChannels.chatOpened, { mode: 'chat', hasKey: true, keyPersists: true }],
    ])
    expect(window.setPosition.mock.invocationCallOrder[0]).toBeLessThan(
      window.show.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('asks for the key first when there is none, and opens on the key when asked to', () => {
    const noKey = setup({ hasKey: false, keyPersists: false })
    noKey.controller.open('chat')
    expect(noKey.window.webContents.send).toHaveBeenLastCalledWith(IpcChannels.chatOpened, {
      mode: 'key',
      hasKey: false,
      keyPersists: false,
    })

    const change = setup()
    change.controller.open('key')
    expect(change.window.webContents.send).toHaveBeenLastCalledWith(IpcChannels.chatOpened, {
      mode: 'key',
      hasKey: true,
      keyPersists: true,
    })
  })

  it('closes on blur and on Escape, and the conversation ends with it (CA4, CA5)', () => {
    const blur = setup()
    blur.controller.open('chat')
    blur.emit('blur')
    expect(blur.window.hide).toHaveBeenCalledOnce()
    expect(blur.onClose).toHaveBeenCalledOnce()

    const escape = setup()
    escape.controller.open('chat')
    escape.press('a')
    escape.press('Escape', 'keyUp')
    expect(escape.window.hide).not.toHaveBeenCalled()
    const pressed = escape.press('Escape')
    expect(escape.window.hide).toHaveBeenCalledOnce()
    expect(pressed.preventDefault).toHaveBeenCalledOnce()
    expect(escape.onClose).toHaveBeenCalledOnce()
  })

  it('opening again while open starts a fresh conversation', () => {
    const { window, controller, onClose } = setup()
    controller.open('chat')

    controller.open('key')

    expect(onClose).toHaveBeenCalledOnce()
    expect(window.show).toHaveBeenCalledTimes(2)
  })

  it('follows Fai while open, moving its tail with her', () => {
    const { window, controller } = setup()
    controller.open('chat')
    window.setPosition.mockClear()
    window.webContents.send.mockClear()

    controller.follow({ x: 1716, y: 864 })

    expect(window.setPosition).toHaveBeenCalledExactlyOnceWith(1620, 864 - BUBBLE_GAP_PX - 380)
    expect(window.webContents.send).toHaveBeenCalledExactlyOnceWith(IpcChannels.chatPlaced, {
      tail: 'down',
      tailAt: 190,
    })
  })

  it('does not move while hidden, and hides when the panel takes its place', () => {
    const { window, controller, onClose } = setup()
    controller.follow({ x: 1716, y: 864 })
    expect(window.setPosition).not.toHaveBeenCalled()

    controller.open('chat')
    controller.hide()

    expect(window.hide).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
