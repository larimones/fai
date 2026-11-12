import {
  createTask,
  deleteTask,
  type InvalidTitle,
  setTaskDone,
  type Task,
  TITLE_MAX_LENGTH,
} from '@domain/tasks/tasks'
import { IpcRuleError } from '../ipc/invoke-handler'
import type { TaskIpc } from '../ipc/register-handlers'

export interface TaskServiceOptions {
  /** Where the task list lives: the app's copy of the data document, saved by the DataStore. */
  readonly store: {
    readonly read: () => readonly Task[]
    readonly write: (tasks: readonly Task[]) => void
  }
  readonly newId: () => string
  /** The current instant, ISO 8601 in UTC. */
  readonly now: () => string
  /** Makes Fai celebrate (RF-12 CA2). */
  readonly celebrate: () => void
}

const TITLE_MESSAGES: Readonly<Record<InvalidTitle['reason'], string>> = {
  EMPTY: 'Escreva um título para a tarefa.',
  TOO_LONG: `O título pode ter até ${String(TITLE_MAX_LENGTH)} caracteres.`,
}

const NOT_FOUND_MESSAGE = 'Essa tarefa não existe mais.'

/** Applies the task rules to the stored list and saves every change (ADR-0015). */
export function createTaskService(options: TaskServiceOptions): TaskIpc {
  const { store, newId, now, celebrate } = options

  return {
    list: () => store.read(),

    create(title) {
      const result = createTask(store.read(), { id: newId(), title, now: now() })
      if (!result.ok) {
        throw result.code === 'INVALID_TITLE'
          ? new IpcRuleError('INVALID_TITLE', TITLE_MESSAGES[result.reason])
          : new IpcRuleError('NOT_FOUND', NOT_FOUND_MESSAGE)
      }
      store.write(result.tasks)
      return result.task
    },

    setDone(id, done) {
      const before = store.read().find((task) => task.id === id)
      const result = setTaskDone(store.read(), id, done, now())
      if (!result.ok) {
        throw new IpcRuleError('NOT_FOUND', NOT_FOUND_MESSAGE)
      }
      store.write(result.tasks)
      // Only a task that was pending celebrates; completing it again changes nothing.
      if (done && before?.completedAt === null) {
        celebrate()
      }
      return result.task
    },

    delete(id) {
      const result = deleteTask(store.read(), id)
      if (!result.ok) {
        throw new IpcRuleError('NOT_FOUND', NOT_FOUND_MESSAGE)
      }
      store.write(result.tasks)
    },
  }
}
