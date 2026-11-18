import type { MenuItemConstructorOptions } from 'electron'

export interface MascotMenuActions {
  readonly openPanel: () => void
  readonly openChat: () => void
}

/** Fai's right-click menu (RF-10 CA1, RF-18 CA1). */
export function buildMascotMenu(actions: MascotMenuActions): MenuItemConstructorOptions[] {
  return [
    { label: 'Abrir painel', click: actions.openPanel },
    { label: 'Conversar', click: actions.openChat },
  ]
}
