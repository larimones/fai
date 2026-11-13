import {
  createReminder,
  deleteReminder,
  type InvalidText,
  type Reminder,
} from '@domain/reminders/reminders'
import { SHORT_TEXT_MAX_LENGTH } from '@domain/text'
import { IpcRuleError } from '../ipc/invoke-handler'
import type { ReminderIpc } from '../ipc/register-handlers'

export interface ReminderStore {
  readonly read: () => readonly Reminder[]
  readonly write: (reminders: readonly Reminder[]) => void
}

export interface ReminderServiceOptions {
  /** Where the reminders live: the app's copy of the data document, saved by the DataStore. */
  readonly store: ReminderStore
  readonly newId: () => string
  /** The current instant, ISO 8601 in UTC. */
  readonly now: () => string
  /** Runs after a reminder is saved; the scheduler checks right away (ADR-0016). */
  readonly onCreated: () => void
}

const TEXT_MESSAGES: Readonly<Record<InvalidText['reason'], string>> = {
  EMPTY: 'Escreva do que a Fai deve lembrar.',
  TOO_LONG: `O lembrete pode ter até ${String(SHORT_TEXT_MAX_LENGTH)} caracteres.`,
}

/** Applies the reminder rules to the stored list and saves every change (ADR-0016). */
export function createReminderService(options: ReminderServiceOptions): ReminderIpc {
  const { store, newId, now, onCreated } = options

  return {
    list: () => store.read(),

    create(text, dueAt) {
      const result = createReminder(store.read(), { id: newId(), text, dueAt, now: now() })
      if (!result.ok) {
        throw result.code === 'INVALID_TEXT'
          ? new IpcRuleError('INVALID_TEXT', TEXT_MESSAGES[result.reason])
          : new IpcRuleError('DUE_NOT_IN_FUTURE', 'Escolha um horário no futuro.')
      }
      store.write(result.reminders)
      onCreated()
      return result.reminder
    },

    delete(id) {
      const result = deleteReminder(store.read(), id)
      if (!result.ok) {
        throw new IpcRuleError('NOT_FOUND', 'Esse lembrete não existe mais.')
      }
      store.write(result.reminders)
    },
  }
}
