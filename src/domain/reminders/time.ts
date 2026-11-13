/**
 * Local-time helpers for reminders (CA3, ADR-0016). They take the current instant as a
 * parameter and read the calendar in the computer's time zone (local `Date` methods).
 */

export interface QuickTimes {
  readonly in15Minutes: string
  readonly in1Hour: string
  /** 09:00 local time on the next calendar day. */
  readonly tomorrowAt9: string
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** The instant `minutes` from now, dropping seconds: datetime fields work to the minute. */
function plusMinutes(now: Date, minutes: number): string {
  const result = new Date(now.getTime() + minutes * 60_000)
  result.setSeconds(0, 0)
  return result.toISOString()
}

export function quickTimes(now: string): QuickTimes {
  const current = new Date(now)
  const tomorrow = new Date(current)
  tomorrow.setDate(current.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  return {
    in15Minutes: plusMinutes(current, 15),
    in1Hour: plusMinutes(current, 60),
    tomorrowAt9: tomorrow.toISOString(),
  }
}

/** Days from `now`'s local date to `instant`'s local date. */
function dayDifference(instant: Date, now: Date): number {
  const startOfDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.round((startOfDay(instant) - startOfDay(now)) / 86_400_000)
}

/** "hoje 15:30", "amanhã 09:00", "ontem 21:00", "20/11 09:00" or "03/02/2027 09:05" (RF-14 CA2). */
export function dueLabel(dueAt: string, now: string): string {
  const due = new Date(dueAt)
  const current = new Date(now)
  const clock = `${pad(due.getHours())}:${pad(due.getMinutes())}`
  const days = dayDifference(due, current)
  if (days === 0) {
    return `hoje ${clock}`
  }
  if (days === 1) {
    return `amanhã ${clock}`
  }
  if (days === -1) {
    return `ontem ${clock}`
  }
  const dayMonth = `${pad(due.getDate())}/${pad(due.getMonth() + 1)}`
  const year = due.getFullYear() === current.getFullYear() ? '' : `/${String(due.getFullYear())}`
  return `${dayMonth}${year} ${clock}`
}

/** The value a `datetime-local` field shows for an instant: local date and time, to the minute. */
export function toLocalInputValue(instant: string): string {
  const date = new Date(instant)
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
