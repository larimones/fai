import type { BrowserWindow, Menu, NativeImage, Tray } from 'electron'
import { linuxDesktopIntegration } from './linux'
import { windowsDesktopIntegration } from './windows'

export interface TrayOptions {
  readonly icon: NativeImage
  readonly tooltip: string
  readonly menu: Menu
  /** Primary activation (left click). Not every platform can report it. */
  readonly onActivate: () => void
}

/**
 * Everything that behaves differently between operating systems (architecture.md).
 * It only grows when a stage needs a new integration.
 */
export interface DesktopIntegration {
  createTray(options: TrayOptions): Tray
  /**
   * Lets clicks pass through the window to whatever is behind it, while the
   * window keeps receiving mouse moves for its hit-test (ADR-0004).
   */
  setClickThrough(window: Pick<BrowserWindow, 'setIgnoreMouseEvents'>, enabled: boolean): void
}

export function createDesktopIntegration(platform: NodeJS.Platform): DesktopIntegration {
  switch (platform) {
    case 'win32':
      return windowsDesktopIntegration
    case 'linux':
      return linuxDesktopIntegration
    default:
      throw new Error(`Plataforma não suportada: ${platform}. A Fai roda no Windows e no Linux.`)
  }
}
