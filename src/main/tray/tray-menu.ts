import type { MenuItemConstructorOptions } from 'electron'

export interface TrayMenuActions {
  readonly toggleFai: () => void
  readonly openPanel: () => void
  readonly quit: () => void
}

/** Tray menu template (RF-03 CA1). */
export function buildTrayMenu(actions: TrayMenuActions): MenuItemConstructorOptions[] {
  return [
    { label: 'Mostrar/ocultar Fai', click: actions.toggleFai },
    { label: 'Abrir painel', click: actions.openPanel },
    { type: 'separator' },
    { label: 'Sair', click: actions.quit },
  ]
}
