import type { ChatApi, FaiApi, PanelApi } from '@shared/ipc/api'

declare global {
  interface Window {
    /** Only on the mascot page (`preload/mascot.ts`). */
    readonly fai: FaiApi
    /** Only on the panel page (`preload/panel.ts`, ADR-0014). */
    readonly faiPanel: PanelApi
    /** Only on the chat bubble page (`preload/chat.ts`, ADR-0017). */
    readonly faiChat: ChatApi
  }
}
