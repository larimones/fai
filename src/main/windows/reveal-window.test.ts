import { describe, expect, it, vi } from 'vitest'
import { revealWindow, toggleWindow, type ToggleableWindow } from './reveal-window'

function fakeWindow(state: { minimized: boolean; visible: boolean }) {
  return {
    isMinimized: vi.fn(() => state.minimized),
    restore: vi.fn(),
    isVisible: vi.fn(() => state.visible),
    show: vi.fn(),
    focus: vi.fn(),
    hide: vi.fn(),
  } satisfies ToggleableWindow
}

describe('revealWindow (RF-02)', () => {
  it('only focuses a window that is already visible', () => {
    const window = fakeWindow({ minimized: false, visible: true })

    revealWindow(window)

    expect(window.restore).not.toHaveBeenCalled()
    expect(window.show).not.toHaveBeenCalled()
    expect(window.focus).toHaveBeenCalledOnce()
  })

  it('restores a minimized window before focusing it', () => {
    const window = fakeWindow({ minimized: true, visible: true })

    revealWindow(window)

    expect(window.restore).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })

  it('shows a hidden window before focusing it', () => {
    const window = fakeWindow({ minimized: false, visible: false })

    revealWindow(window)

    expect(window.show).toHaveBeenCalledOnce()
    expect(window.show.mock.invocationCallOrder[0]).toBeLessThan(
      window.focus.mock.invocationCallOrder[0] ?? 0,
    )
  })
})

describe('toggleWindow (RF-03)', () => {
  it('hides a window the user can see', () => {
    const window = fakeWindow({ minimized: false, visible: true })

    toggleWindow(window)

    expect(window.hide).toHaveBeenCalledOnce()
    expect(window.focus).not.toHaveBeenCalled()
  })

  it('brings back a hidden or minimized window', () => {
    const hidden = fakeWindow({ minimized: false, visible: false })
    const minimized = fakeWindow({ minimized: true, visible: true })

    toggleWindow(hidden)
    toggleWindow(minimized)

    expect(hidden.show).toHaveBeenCalledOnce()
    expect(minimized.restore).toHaveBeenCalledOnce()
    expect(hidden.hide).not.toHaveBeenCalled()
    expect(minimized.hide).not.toHaveBeenCalled()
  })
})
