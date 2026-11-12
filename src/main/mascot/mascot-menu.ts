import type { MenuItemConstructorOptions } from 'electron'

export interface MascotMenuActions {
  readonly openPanel: () => void
}

/** Fai's right-click menu (RF-10 CA1); for now only "Abrir painel" (owner's decision, 2026-11-06). */
export function buildMascotMenu(actions: MascotMenuActions): MenuItemConstructorOptions[] {
  return [{ label: 'Abrir painel', click: actions.openPanel }]
}
