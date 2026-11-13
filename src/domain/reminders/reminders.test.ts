import { describe, expect, it } from 'vitest'
import {
  createReminder,
  deleteReminder,
  dueReminders,
  LATE_AFTER_MS,
  markNotified,
  planAnnouncements,
  type Reminder,
  reminderView,
  SUMMARY_ABOVE,
} from './reminders'

const NOW = '2026-11-13T12:00:00.000Z'
const at = (offsetSeconds: number) => new Date(Date.parse(NOW) + offsetSeconds * 1000).toISOString()

function frozen<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(frozen)
    Object.freeze(value)
  }
  return value
}

let counter = 0
function reminder(
  text: string,
  dueOffset: number,
  notified?: { at: number; late: boolean },
): Reminder {
  counter += 1
  return {
    id: `id-${String(counter)}`,
    text,
    dueAt: at(dueOffset),
    createdAt: at(-3600),
    notifiedAt: notified === undefined ? null : at(notified.at),
    late: notified?.late ?? false,
  }
}

describe('createReminder (RF-14 CA1)', () => {
  it('adds a pending reminder with the given id and time, without changing the input', () => {
    const reminders = frozen([reminder('antigo', 600)])

    const result = createReminder(reminders, {
      id: 'novo',
      text: '  tomar água ',
      dueAt: at(900),
      now: NOW,
    })

    expect(result).toEqual({
      ok: true,
      reminder: {
        id: 'novo',
        text: 'tomar água',
        dueAt: at(900),
        createdAt: NOW,
        notifiedAt: null,
        late: false,
      },
      reminders: [reminders[0], expect.objectContaining({ id: 'novo' })],
    })
  })

  it('refuses an invalid text', () => {
    expect(createReminder([], { id: 'x', text: '  ', dueAt: at(60), now: NOW })).toEqual({
      ok: false,
      code: 'INVALID_TEXT',
      reason: 'EMPTY',
    })
    expect(createReminder([], { id: 'x', text: 'a'.repeat(201), dueAt: at(60), now: NOW })).toEqual(
      {
        ok: false,
        code: 'INVALID_TEXT',
        reason: 'TOO_LONG',
      },
    )
  })

  it('refuses a time that is not in the future', () => {
    for (const dueAt of [NOW, at(-1), at(-86_400)]) {
      expect(createReminder([], { id: 'x', text: 'ok', dueAt, now: NOW })).toEqual({
        ok: false,
        code: 'DUE_NOT_IN_FUTURE',
      })
    }
    expect(createReminder([], { id: 'x', text: 'ok', dueAt: at(1), now: NOW })).toMatchObject({
      ok: true,
    })
  })
})

describe('deleteReminder (RF-14 CA2)', () => {
  it('removes a reminder, or reports one that does not exist', () => {
    const reminders = frozen([reminder('a', 60), reminder('b', 120)])

    expect(deleteReminder(reminders, reminders[0]?.id ?? '')).toEqual({
      ok: true,
      reminders: [reminders[1]],
    })
    expect(deleteReminder(reminders, 'nope')).toEqual({ ok: false, code: 'NOT_FOUND' })
  })
})

describe('dueReminders and markNotified (RF-15 CA3, RF-16 CA1)', () => {
  it('finds pending reminders whose time has come, and never the ones already notified', () => {
    const past = reminder('vencido', -10)
    const exact = reminder('agora', 0)
    const future = reminder('depois', 10)
    const done = reminder('já avisado', -100, { at: -90, late: false })

    expect(dueReminders([past, exact, future, done], NOW).map((r) => r.text)).toEqual([
      'vencido',
      'agora',
    ])
  })

  it('records the notification time and marks as late only more than 60 s after the due time', () => {
    expect(LATE_AFTER_MS).toBe(60_000)
    const onTime = reminder('59 s', -59)
    const borderline = reminder('60 s', -60)
    const late = reminder('61 s', -61)
    const other = reminder('outro', 300)
    const reminders = frozen([onTime, borderline, late, other])

    const marked = markNotified(reminders, [onTime.id, borderline.id, late.id], NOW)

    expect(marked.map((r) => [r.text, r.notifiedAt, r.late])).toEqual([
      ['59 s', NOW, false],
      ['60 s', NOW, false],
      ['61 s', NOW, true],
      ['outro', null, false],
    ])
  })
})

describe('planAnnouncements (RF-16 CA1, CA8)', () => {
  const onTime = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      reminder(`no horário ${String(i)}`, -5, { at: 0, late: false }),
    )
  const late = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      reminder(`atrasado ${String(i)}`, -3600 + i, { at: 0, late: true }),
    )

  it('announces nothing when nothing was notified', () => {
    expect(planAnnouncements([])).toEqual([])
  })

  it('announces on-time reminders one by one', () => {
    expect(planAnnouncements(onTime(2)).map((a) => a.kind)).toEqual(['single', 'single'])
  })

  it('announces up to 3 late reminders one by one, marked late', () => {
    expect(SUMMARY_ABOVE).toBe(3)
    const plan = planAnnouncements(late(3))

    expect(plan).toHaveLength(3)
    expect(plan.every((a) => a.kind === 'single' && a.reminder.late)).toBe(true)
  })

  it('sums up more than 3 late reminders in one announcement, and keeps the on-time ones apart', () => {
    const plan = planAnnouncements([...onTime(1), ...late(4)])

    expect(
      plan.map((a) => (a.kind === 'single' ? a.reminder.text : `resumo ${String(a.count)}`)),
    ).toEqual(['no horário 0', 'resumo 4'])
  })
})

describe('reminderView (RF-14 CA2, CA9)', () => {
  it('lists pending reminders soonest first and notified ones by notification, latest first', () => {
    const view = reminderView([
      reminder('amanhã', 86_400),
      reminder('avisado cedo', -7200, { at: -7000, late: false }),
      reminder('daqui a pouco', 600),
      reminder('avisado agora', -100, { at: -10, late: true }),
    ])

    expect(view.pending.map((r) => r.text)).toEqual(['daqui a pouco', 'amanhã'])
    expect(view.notified.map((r) => r.text)).toEqual(['avisado agora', 'avisado cedo'])
  })
})
