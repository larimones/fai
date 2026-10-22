import { describe, expect, it, vi } from 'vitest'
import { revealWindow, type RevealableWindow } from './reveal-window'

function fakeWindow(state: { minimized: boolean; visible: boolean }) {
  return {
    isMinimized: vi.fn(() => state.minimized),
    restore: vi.fn(),
    isVisible: vi.fn(() => state.visible),
    show: vi.fn(),
    focus: vi.fn(),
  } satisfies RevealableWindow
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
