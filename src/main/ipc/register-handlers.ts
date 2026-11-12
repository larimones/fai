import type { IpcMain } from 'electron'
import type { AppInfo } from '@domain/app-info'
import type { Task } from '@domain/tasks/tasks'
import type { DragPhase } from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'
import { invokeContract, sendContract } from '@shared/ipc/schemas'
import { createInvokeHandler, type SenderGuard } from './invoke-handler'
import { createSendHandler } from './send-handler'

type Ipc = Pick<IpcMain, 'handle' | 'on'>

/** Channels any app window may use; `guard` should accept every app window. */
export function registerAppHandlers(
  ipcMain: Ipc,
  guard: SenderGuard,
  deps: { readonly getAppInfo: () => AppInfo },
): void {
  ipcMain.handle(
    IpcChannels.appGetInfo,
    createInvokeHandler(invokeContract[IpcChannels.appGetInfo], guard, deps.getAppInfo),
  )
}

export interface MascotIpc {
  readonly setInteractive: (interactive: boolean) => void
  readonly drag: (phase: DragPhase) => void
}

/** The mascot window's channels; `guard` should accept only the mascot window (ADR-0014). */
export function registerMascotHandlers(ipcMain: Ipc, guard: SenderGuard, mascot: MascotIpc): void {
  ipcMain.on(
    IpcChannels.mascotSetInteractive,
    createSendHandler(sendContract[IpcChannels.mascotSetInteractive], guard, ({ interactive }) => {
      mascot.setInteractive(interactive)
    }),
  )
  ipcMain.on(
    IpcChannels.mascotDrag,
    createSendHandler(sendContract[IpcChannels.mascotDrag], guard, ({ phase }) => {
      mascot.drag(phase)
    }),
  )
}

/** What the panel can do with tasks; rule refusals are thrown as `IpcRuleError`. */
export interface TaskIpc {
  readonly list: () => readonly Task[]
  readonly create: (title: string) => Task
  readonly setDone: (id: string, done: boolean) => Task
  readonly delete: (id: string) => void
}

/** The panel window's channels; `guard` should accept only the panel window (ADR-0014). */
export function registerTaskHandlers(ipcMain: Ipc, guard: SenderGuard, tasks: TaskIpc): void {
  ipcMain.handle(
    IpcChannels.tasksList,
    createInvokeHandler(invokeContract[IpcChannels.tasksList], guard, () => tasks.list()),
  )
  ipcMain.handle(
    IpcChannels.tasksCreate,
    createInvokeHandler(invokeContract[IpcChannels.tasksCreate], guard, ({ title }) =>
      tasks.create(title),
    ),
  )
  ipcMain.handle(
    IpcChannels.tasksSetDone,
    createInvokeHandler(invokeContract[IpcChannels.tasksSetDone], guard, ({ id, done }) =>
      tasks.setDone(id, done),
    ),
  )
  ipcMain.handle(
    IpcChannels.tasksDelete,
    createInvokeHandler(invokeContract[IpcChannels.tasksDelete], guard, ({ id }) => {
      tasks.delete(id)
      return null
    }),
  )
}
