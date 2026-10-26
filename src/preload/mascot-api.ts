import type { IpcRenderer } from 'electron'
import type { AppInfo } from '@domain/app-info'
import type { DragMessage, FaiApi, IpcResult, SetInteractiveMessage } from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'

/** Builds `window.fai` for the mascot window. Named functions only: never expose ipcRenderer. */
export function createMascotApi(ipc: Pick<IpcRenderer, 'invoke' | 'send'>): FaiApi {
  return {
    app: {
      getInfo: () => ipc.invoke(IpcChannels.appGetInfo) as Promise<IpcResult<AppInfo>>,
    },
    mascot: {
      setInteractive: (interactive) => {
        ipc.send(IpcChannels.mascotSetInteractive, { interactive } satisfies SetInteractiveMessage)
      },
      drag: (phase) => {
        ipc.send(IpcChannels.mascotDrag, { phase } satisfies DragMessage)
      },
    },
  }
}
