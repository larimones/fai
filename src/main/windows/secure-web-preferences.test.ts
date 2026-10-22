import { describe, expect, it } from 'vitest'
import { secureWebPreferences } from './secure-web-preferences'

describe('secureWebPreferences (RNF-01 CA1)', () => {
  it('isolates the renderer', () => {
    expect(secureWebPreferences('/app/preload/main.js', { devTools: false })).toMatchObject({
      preload: '/app/preload/main.js',
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: false,
    })
  })
})
