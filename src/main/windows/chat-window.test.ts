import { describe, expect, it, vi } from 'vitest'
import { CHAT_SIZE, chatWindowOptions } from './chat-window'

vi.mock('electron', () => ({ BrowserWindow: vi.fn() }))

describe('chatWindowOptions (ADR-0017)', () => {
  const options = chatWindowOptions('/app/preload/chat.js', { devTools: false })

  it('is a 300×380 frameless see-through window, hidden until opened', () => {
    expect(CHAT_SIZE).toEqual({ width: 300, height: 380 })
    expect(options).toMatchObject({
      width: 300,
      height: 380,
      useContentSize: true,
      title: 'Conversa com a Fai',
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
    })
  })

  it('can take focus, so the keyboard works (CA4)', () => {
    expect(options.focusable).not.toBe(false)
  })

  it('uses the secure preferences with the chat preload (RNF-01)', () => {
    expect(options.webPreferences).toMatchObject({
      preload: '/app/preload/chat.js',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
    })
  })
})
