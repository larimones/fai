import { describe, expect, it, vi } from 'vitest'
import { PANEL_SIZE, panelWindowOptions } from './panel-window'

vi.mock('electron', () => ({ BrowserWindow: vi.fn() }))

describe('panelWindowOptions (ADR-0014)', () => {
  const options = panelWindowOptions('/app/preload/panel.js', { devTools: false })

  it('is a 320×440 frameless see-through window, hidden until opened', () => {
    expect(PANEL_SIZE).toEqual({ width: 320, height: 440 })
    expect(options).toMatchObject({
      width: 320,
      height: 440,
      useContentSize: true,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
    })
  })

  it('can take focus, unlike the mascot, so the keyboard works (RF-10 CA2)', () => {
    expect(options.focusable).not.toBe(false)
  })

  it('uses the secure preferences with the panel preload', () => {
    expect(options.webPreferences).toMatchObject({
      preload: '/app/preload/panel.js',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
    })
  })
})
