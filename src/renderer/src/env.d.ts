import type { FaiApi } from '@shared/ipc/api'

declare global {
  interface Window {
    readonly fai: FaiApi
  }
}
