import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Reminder } from '@domain/reminders/reminders'
import { CHECK_INTERVAL_MS, createReminderScheduler } from './scheduler'

const DUE = '2026-11-13T15:00:00.000Z'

const reminder = (n: number, dueAt = DUE, text = `Lembrete ${String(n)}`): Reminder => ({
  id: `00000000-0000-4000-8000-00000000000${String(n)}`,
  text,
  dueAt,
  createdAt: '2026-11-13T10:00:00.000Z',
  notifiedAt: null,
  late: false,
})

function setup(initial: readonly Reminder[], start = '2026-11-13T14:59:50.000Z') {
  let stored = initial
  let clock = Date.parse(start)
  const store = {
    read: vi.fn(() => stored),
    write: vi.fn((reminders: readonly Reminder[]) => {
      stored = reminders
    }),
  }
  const notify = vi.fn()
  const react = vi.fn()
  const changed = vi.fn()
  const scheduler = createReminderScheduler({
    store,
    now: () => new Date(clock).toISOString(),
    notify,
    react,
    changed,
  })
  return {
    scheduler,
    store,
    notify,
    react,
    changed,
    stored: () => stored,
    advance: (ms: number) => {
      clock += ms
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('reminder scheduler (RF-15, RF-16, ADR-0016)', () => {
  it('stays quiet before the time and announces at the first check after it, on time (CA4, CA6)', () => {
    const { scheduler, notify, react, changed, store, stored, advance } = setup([
      reminder(1, DUE, 'Tomar água'),
    ])

    scheduler.check()
    expect(notify).not.toHaveBeenCalled()
    expect(store.write).not.toHaveBeenCalled()

    advance(15_000)
    scheduler.check()

    expect(notify).toHaveBeenCalledExactlyOnceWith({ title: 'Fai ✨', body: 'Tomar água' })
    expect(stored()[0]).toMatchObject({ notifiedAt: '2026-11-13T15:00:05.000Z', late: false })
    expect(react).toHaveBeenCalledOnce()
    expect(changed).toHaveBeenCalledOnce()
  })

  it('never announces the same reminder twice (CA6)', () => {
    const { scheduler, notify, react, changed, advance } = setup([reminder(1)])
    advance(15_000)

    scheduler.check()
    advance(15_000)
    scheduler.check()
    scheduler.check()

    expect(notify).toHaveBeenCalledOnce()
    expect(react).toHaveBeenCalledOnce()
    expect(changed).toHaveBeenCalledOnce()
  })

  it('saves notifiedAt before showing anything, so a failed notification is not repeated (CA6)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { scheduler, notify, store, advance } = setup([reminder(1), reminder(2)])
    // Recorded here and checked outside: the scheduler catches whatever notify throws.
    const writesBeforeNotify: number[] = []
    notify.mockImplementation(() => {
      writesBeforeNotify.push(store.write.mock.calls.length)
      throw new Error('no notification server')
    })
    advance(15_000)

    scheduler.check()
    scheduler.check()

    expect(writesBeforeNotify).toEqual([1, 1])
    expect(console.error).toHaveBeenCalled()
  })

  it('marks reminders missed while closed or asleep as late and says so (CA7)', () => {
    const { scheduler, notify, stored, advance } = setup([reminder(1, DUE, 'Regar')])
    advance(2 * 60 * 60 * 1000)

    scheduler.check()

    expect(stored()[0]).toMatchObject({ late: true })
    expect(notify).toHaveBeenCalledExactlyOnceWith({ title: 'Fai ✨', body: 'Regar (atrasado)' })
  })

  it('announces up to 3 late reminders one by one, and more than 3 as one summary (CA8)', () => {
    const three = setup([reminder(1), reminder(2), reminder(3)])
    three.advance(60 * 60 * 1000)
    three.scheduler.check()
    expect(three.notify).toHaveBeenCalledTimes(3)

    const four = setup([reminder(1), reminder(2), reminder(3), reminder(4)])
    four.advance(60 * 60 * 1000)
    four.scheduler.check()
    expect(four.notify).toHaveBeenCalledExactlyOnceWith({
      title: 'Fai ✨',
      body: 'Você tem 4 lembretes atrasados',
    })
    expect(four.stored().every((r) => r.late && r.notifiedAt !== null)).toBe(true)
    expect(four.react).toHaveBeenCalledOnce()
  })

  it('does nothing with an empty or already-announced list', () => {
    const { scheduler, notify, react, changed, store } = setup([
      { ...reminder(1), notifiedAt: DUE },
    ])

    scheduler.check()

    expect(store.write).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
    expect(react).not.toHaveBeenCalled()
    expect(changed).not.toHaveBeenCalled()
  })

  it('checks every 15 s once started, until stopped', () => {
    vi.useFakeTimers()
    const { scheduler, store } = setup([])

    const stop = scheduler.start()
    expect(CHECK_INTERVAL_MS).toBe(15_000)
    vi.advanceTimersByTime(CHECK_INTERVAL_MS * 3)
    expect(store.read).toHaveBeenCalledTimes(3)

    stop()
    vi.advanceTimersByTime(CHECK_INTERVAL_MS * 3)
    expect(store.read).toHaveBeenCalledTimes(3)
  })
})
