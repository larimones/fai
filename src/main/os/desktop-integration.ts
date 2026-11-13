import type { BrowserWindow, Menu, NativeImage, Tray } from 'electron'
import { createLinuxDesktopIntegration } from './linux'
import { createWindowsDesktopIntegration } from './windows'

export interface TrayOptions {
  readonly icon: NativeImage
  readonly tooltip: string
  readonly menu: Menu
  /** Primary activation (left click). Not every platform can report it. */
  readonly onActivate: () => void
}

export interface NotifyOptions {
  readonly title: string
  readonly body: string
  readonly onClick: () => void
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
  /** Called once at startup, before any notification (ADR-0016). */
  prepareNotifications(): void
  /** Shows a native notification (RF-15). */
  notify(options: NotifyOptions): void
  /** Notifications shown and not closed yet (kept alive so their click works). */
  openNotifications(): number
}

export function createDesktopIntegration(platform: NodeJS.Platform): DesktopIntegration {
  switch (platform) {
    case 'win32':
      return createWindowsDesktopIntegration()
    case 'linux':
      return createLinuxDesktopIntegration()
    default:
      throw new Error(`Plataforma não suportada: ${platform}. A Fai roda no Windows e no Linux.`)
  }
}
