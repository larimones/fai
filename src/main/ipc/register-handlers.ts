import type { IpcMain } from 'electron'
import type { AppInfo } from '@domain/app-info'
import type { DragPhase } from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'
import { invokeContract, sendContract } from '@shared/ipc/schemas'
import { createInvokeHandler, type SenderGuard } from './invoke-handler'
import { createSendHandler } from './send-handler'

export interface IpcDependencies {
  readonly getAppInfo: () => AppInfo
  readonly mascot: {
    readonly setInteractive: (interactive: boolean) => void
    readonly drag: (phase: DragPhase) => void
  }
}

export function registerIpcHandlers(
  ipcMain: Pick<IpcMain, 'handle' | 'on'>,
  isTrustedSender: SenderGuard,
  deps: IpcDependencies,
): void {
  ipcMain.handle(
    IpcChannels.appGetInfo,
    createInvokeHandler(invokeContract[IpcChannels.appGetInfo], isTrustedSender, deps.getAppInfo),
  )
  ipcMain.on(
    IpcChannels.mascotSetInteractive,
    createSendHandler(
      sendContract[IpcChannels.mascotSetInteractive],
      isTrustedSender,
      ({ interactive }) => {
        deps.mascot.setInteractive(interactive)
      },
    ),
  )
  ipcMain.on(
    IpcChannels.mascotDrag,
    createSendHandler(sendContract[IpcChannels.mascotDrag], isTrustedSender, ({ phase }) => {
      deps.mascot.drag(phase)
    }),
  )
}
