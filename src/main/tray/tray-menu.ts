import type { MenuItemConstructorOptions } from 'electron'

export interface TrayMenuActions {
  readonly toggleFai: () => void
  readonly quit: () => void
}

/** Tray menu template (RF-03). "Abrir painel" joins in Stage 5, together with the panel. */
export function buildTrayMenu(actions: TrayMenuActions): MenuItemConstructorOptions[] {
  return [
    { label: 'Mostrar/ocultar Fai', click: actions.toggleFai },
    { type: 'separator' },
    { label: 'Sair', click: actions.quit },
  ]
}
