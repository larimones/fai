import {
  type Announcement,
  dueReminders,
  markNotified,
  planAnnouncements,
} from '@domain/reminders/reminders'
import type { ReminderStore } from './reminder-service'

/** How often the scheduler looks for due reminders (ADR-0006, ADR-0016). */
export const CHECK_INTERVAL_MS = 15_000

export interface ReminderNotice {
  readonly title: string
  readonly body: string
}

export interface ReminderSchedulerOptions {
  readonly store: ReminderStore
  /** The current instant, ISO 8601 in UTC. */
  readonly now: () => string
  /** Shows a native notification; clicking it opens the panel on the reminders tab. */
  readonly notify: (notice: ReminderNotice) => void
  /** Makes Fai play the reminder reaction. */
  readonly react: () => void
  /** Tells the panel to reload the reminders tab. */
  readonly changed: () => void
}

export interface ReminderScheduler {
  /** Announces every due reminder once; runs at start, every 15 s, on resume and after creating. */
  readonly check: () => void
  /** Checks every `CHECK_INTERVAL_MS`; returns the function that stops it. */
  readonly start: () => () => void
}

const TITLE = 'Fai ✨'

function noticeFor(announcement: Announcement): ReminderNotice {
  if (announcement.kind === 'summary') {
    return { title: TITLE, body: `Você tem ${String(announcement.count)} lembretes atrasados` }
  }
  const { text, late } = announcement.reminder
  return { title: TITLE, body: late ? `${text} (atrasado)` : text }
}

export function createReminderScheduler(options: ReminderSchedulerOptions): ReminderScheduler {
  const { store, now, notify, react, changed } = options

  const check = (): void => {
    const at = now()
    const due = dueReminders(store.read(), at)
    if (due.length === 0) {
      return
    }
    const ids = due.map((reminder) => reminder.id)
    const updated = markNotified(store.read(), ids, at)
    // Saved before showing anything: a reminder is announced at most once (RF-15 CA3).
    store.write(updated)
    const notified = updated.filter((reminder) => ids.includes(reminder.id))
    for (const announcement of planAnnouncements(notified)) {
      try {
        notify(noticeFor(announcement))
      } catch (error) {
        console.error('Fai: não foi possível mostrar a notificação do lembrete.', error)
      }
    }
    react()
    changed()
  }

  return {
    check,
    start() {
      const timer = setInterval(check, CHECK_INTERVAL_MS)
      return () => {
        clearInterval(timer)
      }
    },
  }
}
