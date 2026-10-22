import type { IpcMain } from 'electron'
import type { AppInfo } from '@domain/app-info'
import { IpcChannels } from '@shared/ipc/channels'
import { invokeContract } from '@shared/ipc/schemas'
import { createInvokeHandler, type SenderGuard } from './invoke-handler'

export interface IpcDependencies {
  readonly getAppInfo: () => AppInfo
}

export function registerIpcHandlers(
  ipcMain: Pick<IpcMain, 'handle'>,
  isTrustedSender: SenderGuard,
  deps: IpcDependencies,
): void {
  ipcMain.handle(
    IpcChannels.appGetInfo,
    createInvokeHandler(invokeContract[IpcChannels.appGetInfo], isTrustedSender, deps.getAppInfo),
  )
}
