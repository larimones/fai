import type { IpcRenderer } from 'electron'
import type { AppInfo } from '@domain/app-info'
import type { DragMessage, FaiApi, IpcResult, SetInteractiveMessage } from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'
import { eventContract } from '@shared/ipc/schemas'

/** Builds `window.fai` for the mascot window. Named functions only: never expose ipcRenderer. */
export function createMascotApi(
  ipc: Pick<IpcRenderer, 'invoke' | 'send' | 'on' | 'removeListener'>,
): FaiApi {
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
      openMenu: () => {
        ipc.send(IpcChannels.mascotOpenMenu)
      },
      onReaction(listener) {
        // The Electron event never reaches the page, and an unknown reaction is dropped.
        const handler = (_event: unknown, payload?: unknown): void => {
          const reaction = eventContract[IpcChannels.mascotReaction].safeParse(payload)
          if (reaction.success) {
            listener(reaction.data)
          }
        }
        ipc.on(IpcChannels.mascotReaction, handler)
        return () => {
          ipc.removeListener(IpcChannels.mascotReaction, handler)
        }
      },
    },
  }
}
