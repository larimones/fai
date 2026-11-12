import type { FaiApi, PanelApi } from '@shared/ipc/api'

declare global {
  interface Window {
    /** Only on the mascot page (`preload/mascot.ts`). */
    readonly fai: FaiApi
    /** Only on the panel page (`preload/panel.ts`, ADR-0014). */
    readonly faiPanel: PanelApi
  }
}
