import { describe, expect, it, vi } from 'vitest'
import { revealWindow, toggleWindow, type ToggleableWindow } from './reveal-window'

function fakeWindow(visible: boolean) {
  return {
    isVisible: vi.fn(() => visible),
    showInactive: vi.fn(),
    hide: vi.fn(),
  } satisfies ToggleableWindow
}

describe('revealWindow (RF-02)', () => {
  it('shows a hidden window without focusing it', () => {
    const window = fakeWindow(false)

    revealWindow(window)

    expect(window.showInactive).toHaveBeenCalledOnce()
  })

  it('leaves a visible window alone', () => {
    const window = fakeWindow(true)

    revealWindow(window)

    expect(window.showInactive).not.toHaveBeenCalled()
  })
})

describe('toggleWindow (RF-03)', () => {
  it('hides a window the user can see', () => {
    const window = fakeWindow(true)

    toggleWindow(window)

    expect(window.hide).toHaveBeenCalledOnce()
    expect(window.showInactive).not.toHaveBeenCalled()
  })

  it('brings back a hidden window without focusing it', () => {
    const window = fakeWindow(false)

    toggleWindow(window)

    expect(window.showInactive).toHaveBeenCalledOnce()
    expect(window.hide).not.toHaveBeenCalled()
  })
})
