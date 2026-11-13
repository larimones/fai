import { type ShortTextResult, validateShortText } from '../text'

/** A reminder (ADR-0016). Times are ISO 8601 instants in UTC. */
export interface Reminder {
  readonly id: string
  readonly text: string
  readonly dueAt: string
  readonly createdAt: string
  /** When it was announced; `null` while pending. */
  readonly notifiedAt: string | null
  /** Announced more than `LATE_AFTER_MS` after its time (app closed, computer asleep). */
  readonly late: boolean
}

/** The scheduler checks every 15 s; past this, the announcement came late (ADR-0016). */
export const LATE_AFTER_MS = 60_000

/** More late reminders than this at once become a single summary (owner's decision, 2026-11-13). */
export const SUMMARY_ABOVE = 3

export type InvalidText = {
  readonly ok: false
  readonly code: 'INVALID_TEXT'
  readonly reason: Extract<ShortTextResult, { ok: false }>['reason']
}

export type ReminderCreation =
  | { readonly ok: true; readonly reminders: readonly Reminder[]; readonly reminder: Reminder }
  | InvalidText
  | { readonly ok: false; readonly code: 'DUE_NOT_IN_FUTURE' }

export type ReminderRemoval =
  | { readonly ok: true; readonly reminders: readonly Reminder[] }
  | { readonly ok: false; readonly code: 'NOT_FOUND' }

export type Announcement =
  | { readonly kind: 'single'; readonly reminder: Reminder }
  | { readonly kind: 'summary'; readonly count: number }

const time = (instant: string): number => Date.parse(instant)

/** Adds a pending reminder (RF-14 CA1); id and current instant come from the caller. */
export function createReminder(
  reminders: readonly Reminder[],
  input: {
    readonly id: string
    readonly text: string
    readonly dueAt: string
    readonly now: string
  },
): ReminderCreation {
  const text = validateShortText(input.text)
  if (!text.ok) {
    return { ok: false, code: 'INVALID_TEXT', reason: text.reason }
  }
  if (!(time(input.dueAt) > time(input.now))) {
    return { ok: false, code: 'DUE_NOT_IN_FUTURE' }
  }
  const reminder: Reminder = {
    id: input.id,
    text: text.text,
    dueAt: input.dueAt,
    createdAt: input.now,
    notifiedAt: null,
    late: false,
  }
  return { ok: true, reminders: [...reminders, reminder], reminder }
}

export function deleteReminder(reminders: readonly Reminder[], id: string): ReminderRemoval {
  if (!reminders.some((reminder) => reminder.id === id)) {
    return { ok: false, code: 'NOT_FOUND' }
  }
  return { ok: true, reminders: reminders.filter((reminder) => reminder.id !== id) }
}

/** Pending reminders whose time has come (RF-15 CA3: notified ones never come back). */
export function dueReminders(reminders: readonly Reminder[], now: string): Reminder[] {
  return reminders.filter(
    (reminder) => reminder.notifiedAt === null && time(reminder.dueAt) <= time(now),
  )
}

/** Records that these reminders were announced at `now`, late if past `LATE_AFTER_MS`. */
export function markNotified(
  reminders: readonly Reminder[],
  ids: readonly string[],
  now: string,
): Reminder[] {
  return reminders.map((reminder) =>
    ids.includes(reminder.id)
      ? { ...reminder, notifiedAt: now, late: time(now) - time(reminder.dueAt) > LATE_AFTER_MS }
      : reminder,
  )
}

/**
 * What to show for reminders just marked as notified (RF-16 CA1): on-time ones one by one;
 * late ones one by one up to `SUMMARY_ABOVE`, otherwise a single summary.
 */
export function planAnnouncements(notified: readonly Reminder[]): Announcement[] {
  const byDue = [...notified].sort((a, b) => time(a.dueAt) - time(b.dueAt))
  const onTime = byDue.filter((reminder) => !reminder.late)
  const late = byDue.filter((reminder) => reminder.late)
  const singles = (list: readonly Reminder[]): Announcement[] =>
    list.map((reminder) => ({ kind: 'single', reminder }))
  return [
    ...singles(onTime),
    ...(late.length > SUMMARY_ABOVE
      ? [{ kind: 'summary', count: late.length } as const]
      : singles(late)),
  ]
}

export interface ReminderView {
  /** Soonest first (RF-14 CA2). */
  readonly pending: readonly Reminder[]
  /** Latest announcement first. */
  readonly notified: readonly Reminder[]
}

export function reminderView(reminders: readonly Reminder[]): ReminderView {
  return {
    pending: reminders
      .filter((reminder) => reminder.notifiedAt === null)
      .sort((a, b) => time(a.dueAt) - time(b.dueAt)),
    notified: reminders
      .filter((reminder) => reminder.notifiedAt !== null)
      .sort((a, b) => time(b.notifiedAt ?? '') - time(a.notifiedAt ?? '')),
  }
}
