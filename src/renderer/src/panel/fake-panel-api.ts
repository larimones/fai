import { act } from '@testing-library/react'
import { vi } from 'vitest'
import type { Reminder } from '@domain/reminders/reminders'
import type { Task } from '@domain/tasks/tasks'
import type { IpcErrorCode, IpcResult, PanelApi, PanelTab } from '@shared/ipc/api'

// Test-only: a fake main process for the panel's component tests.

let counter = 0
export const uuid = (): string => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
const ok = <T>(value: T): Promise<IpcResult<T>> => Promise.resolve({ ok: true, value })
const fail = <T>(code: IpcErrorCode, message: string): Promise<IpcResult<T>> =>
  Promise.resolve({ ok: false, error: { code, message } })

/** The fake main process's clock for reminders: 14:00 in São Paulo (vitest fixes the TZ). */
export const NOW = '2026-11-13T17:00:00.000Z'

/** Keeps the tasks and reminders and applies the same refusals as the main process. */
export function installFakePanel(
  options: { tasks?: readonly Task[]; reminders?: readonly Reminder[] } = {},
) {
  let tasks = [...(options.tasks ?? [])]
  let reminders = [...(options.reminders ?? [])]
  const openedListeners = new Set<(tab: PanelTab) => void>()
  const changedListeners = new Set<() => void>()
  let clock = 0
  const taskNow = () => new Date(Date.UTC(2026, 10, 12, 12, 0, clock++)).toISOString()

  const spies = {
    list: vi.fn(() => ok<readonly Task[]>(tasks)),
    create: vi.fn((title: string) => {
      if (title.trim() === '') {
        return fail<Task>('INVALID_TITLE', 'Escreva um título para a tarefa.')
      }
      const task: Task = {
        id: uuid(),
        title: title.trim(),
        createdAt: taskNow(),
        completedAt: null,
      }
      tasks = [...tasks, task]
      return ok(task)
    }),
    setDone: vi.fn((id: string, done: boolean) => {
      const current = tasks.find((task) => task.id === id)
      if (current === undefined) {
        return fail<Task>('NOT_FOUND', 'Essa tarefa não existe mais.')
      }
      const task = { ...current, completedAt: done ? taskNow() : null }
      tasks = tasks.map((candidate) => (candidate.id === id ? task : candidate))
      return ok(task)
    }),
    delete: vi.fn((id: string) => {
      if (!tasks.some((task) => task.id === id)) {
        return fail<null>('NOT_FOUND', 'Essa tarefa não existe mais.')
      }
      tasks = tasks.filter((task) => task.id !== id)
      return ok(null)
    }),
  }
  const reminderSpies = {
    list: vi.fn(() => ok<readonly Reminder[]>(reminders)),
    create: vi.fn((text: string, dueAt: string) => {
      if (text.trim() === '') {
        return fail<Reminder>('INVALID_TEXT', 'Escreva do que a Fai deve lembrar.')
      }
      if (Date.parse(dueAt) <= Date.parse(NOW)) {
        return fail<Reminder>('DUE_NOT_IN_FUTURE', 'Escolha um horário no futuro.')
      }
      const reminder: Reminder = {
        id: uuid(),
        text: text.trim(),
        dueAt,
        createdAt: NOW,
        notifiedAt: null,
        late: false,
      }
      reminders = [...reminders, reminder]
      return ok(reminder)
    }),
    delete: vi.fn((id: string) => {
      if (!reminders.some((reminder) => reminder.id === id)) {
        return fail<null>('NOT_FOUND', 'Esse lembrete não existe mais.')
      }
      reminders = reminders.filter((reminder) => reminder.id !== id)
      return ok(null)
    }),
  }
  const api: PanelApi = {
    tasks: spies,
    reminders: reminderSpies,
    onOpened: (listener) => {
      openedListeners.add(listener)
      return () => {
        openedListeners.delete(listener)
      }
    },
    onRemindersChanged: (listener) => {
      changedListeners.add(listener)
      return () => {
        changedListeners.delete(listener)
      }
    },
  }
  vi.stubGlobal('faiPanel', api)

  return {
    spies,
    reminderSpies,
    /** The main process opened the panel on `tab`. */
    open: async (tab: PanelTab = 'tasks') => {
      await act(async () => {
        openedListeners.forEach((listener) => {
          listener(tab)
        })
        await Promise.resolve()
      })
    },
    /** The scheduler changed the reminders (for example, announced one). */
    changeReminders: async (next: readonly Reminder[]) => {
      reminders = [...next]
      await act(async () => {
        changedListeners.forEach((listener) => {
          listener()
        })
        await Promise.resolve()
      })
    },
    removeBehindTheScenes: (id: string) => {
      tasks = tasks.filter((task) => task.id !== id)
    },
    listening: () => openedListeners.size + changedListeners.size,
  }
}
