import { describe, expect, it, vi } from 'vitest'
import { mascotWindowOptions } from './mascot-window'

vi.mock('electron', () => ({ BrowserWindow: vi.fn() }))

describe('mascotWindowOptions (RF-04)', () => {
  const options = mascotWindowOptions({ x: -300, y: 840 }, '/app/preload/mascot.js', {
    devTools: false,
  })

  it('places a 128×128 window at the given position', () => {
    expect(options).toMatchObject({ x: -300, y: 840, width: 128, height: 128 })
    expect(options.useContentSize).toBe(true)
  })

  it('is frameless, see-through and floating, without taking focus or a taskbar button', () => {
    expect(options).toMatchObject({
      transparent: true,
      frame: false,
      backgroundColor: '#00000000',
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      show: false,
    })
  })

  it('uses the secure preferences with the mascot preload', () => {
    expect(options.webPreferences).toMatchObject({
      preload: '/app/preload/mascot.js',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
    })
  })
})
