import type { IpcRenderer } from 'electron'
import type { AppInfo } from '@domain/app-info'
import type { FaiApi, IpcResult } from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'

/** Builds `window.fai` for the main window. Named functions only: never expose ipcRenderer. */
export function createMainApi(ipc: Pick<IpcRenderer, 'invoke'>): FaiApi {
  return {
    app: {
      getInfo: () => ipc.invoke(IpcChannels.appGetInfo) as Promise<IpcResult<AppInfo>>,
    },
  }
}
