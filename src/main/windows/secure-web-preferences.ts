import type { WebPreferences } from 'electron'

/** The only way windows get webPreferences, so every window is isolated (ADR-0007). */
export function secureWebPreferences(
  preloadPath: string,
  options: { devTools: boolean },
): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    experimentalFeatures: false,
    spellcheck: false,
    devTools: options.devTools,
  }
}
