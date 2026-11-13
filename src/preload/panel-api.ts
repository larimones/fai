import type { IpcRenderer } from 'electron'
import type { Task } from '@domain/tasks/tasks'
import type {
  CreateTaskRequest,
  DeleteTaskRequest,
  IpcResult,
  PanelApi,
  SetTaskDoneRequest,
} from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'
import { eventContract } from '@shared/ipc/schemas'

/** Builds `window.faiPanel` for the panel window. Named functions only: never expose ipcRenderer. */
export function createPanelApi(
  ipc: Pick<IpcRenderer, 'invoke' | 'on' | 'removeListener'>,
): PanelApi {
  return {
    tasks: {
      list: () => ipc.invoke(IpcChannels.tasksList) as Promise<IpcResult<readonly Task[]>>,
      create: (title) =>
        ipc.invoke(IpcChannels.tasksCreate, {
          title,
        } satisfies CreateTaskRequest) as Promise<IpcResult<Task>>,
      setDone: (id, done) =>
        ipc.invoke(IpcChannels.tasksSetDone, {
          id,
          done,
        } satisfies SetTaskDoneRequest) as Promise<IpcResult<Task>>,
      delete: (id) =>
        ipc.invoke(IpcChannels.tasksDelete, { id } satisfies DeleteTaskRequest) as Promise<
          IpcResult<null>
        >,
    },
    onOpened(listener) {
      // The Electron event never reaches the page, and an unexpected payload is dropped.
      const handler = (_event: unknown, payload?: unknown): void => {
        const opened = eventContract[IpcChannels.panelOpened].safeParse(payload)
        if (opened.success) {
          listener(opened.data.tab)
        }
      }
      ipc.on(IpcChannels.panelOpened, handler)
      return () => {
        ipc.removeListener(IpcChannels.panelOpened, handler)
      }
    },
  }
}
