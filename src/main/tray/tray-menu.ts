import type { MenuItemConstructorOptions } from 'electron'

export interface TrayMenuActions {
  readonly toggleFai: () => void
  readonly openPanel: () => void
  readonly openChat: () => void
  /** Opens the chat bubble asking for a new AI key (RF-19 CA1). */
  readonly changeKey: () => void
  /** Asks to confirm, then deletes the AI key. */
  readonly clearKey: () => void
  readonly quit: () => void
}

/** Tray menu template (RF-03 CA1, RF-18 CA1, RF-19 CA1). */
export function buildTrayMenu(actions: TrayMenuActions): MenuItemConstructorOptions[] {
  return [
    { label: 'Mostrar/ocultar Fai', click: actions.toggleFai },
    { label: 'Abrir painel', click: actions.openPanel },
    { label: 'Conversar', click: actions.openChat },
    { type: 'separator' },
    { label: 'Trocar chave da IA…', click: actions.changeKey },
    { label: 'Apagar chave da IA', click: actions.clearKey },
    { type: 'separator' },
    { label: 'Sair', click: actions.quit },
  ]
}
