import { describe, expect, it } from 'vitest'
import { dueLabel, quickTimes, toLocalInputValue } from './time'

// Tests run with TZ=America/Sao_Paulo (UTC-3, no daylight saving), set in vitest.config.mts.
const local = (iso: string) => new Date(iso).toISOString()

describe('fuso dos testes', () => {
  it('is UTC-3, so local-time rules are checked for real', () => {
    expect(new Date('2026-11-13T12:00:00.000Z').getTimezoneOffset()).toBe(180)
  })
})

describe('quickTimes (CA3)', () => {
  it('gives in 15 min, in 1 h and tomorrow at 9:00 local time, on whole minutes', () => {
    // 14:07:42 local
    const times = quickTimes('2026-11-13T17:07:42.500Z')

    expect(times).toEqual({
      in15Minutes: local('2026-11-13T17:22:00.000Z'),
      in1Hour: local('2026-11-13T18:07:00.000Z'),
      tomorrowAt9: local('2026-11-14T12:00:00.000Z'),
    })
  })

  it('crosses midnight, the end of the month and the end of the year', () => {
    // 23:50 local on 31/12
    const times = quickTimes('2027-01-01T02:50:10.000Z')

    expect(times.in15Minutes).toBe(local('2027-01-01T03:05:00.000Z'))
    expect(times.in1Hour).toBe(local('2027-01-01T03:50:00.000Z'))
    expect(times.tomorrowAt9).toBe(local('2027-01-01T12:00:00.000Z'))
  })

  it('tomorrow at 9 is the next calendar day even right after midnight', () => {
    // 00:10 local on 14/11
    expect(quickTimes('2026-11-14T03:10:00.000Z').tomorrowAt9).toBe(
      local('2026-11-15T12:00:00.000Z'),
    )
  })
})

describe('dueLabel (RF-14 CA2)', () => {
  const now = '2026-11-13T17:00:00.000Z' // 14:00 local, 13/11

  it('says today, tomorrow or yesterday with the local time', () => {
    expect(dueLabel('2026-11-13T18:30:00.000Z', now)).toBe('hoje 15:30')
    expect(dueLabel('2026-11-14T12:00:00.000Z', now)).toBe('amanhã 09:00')
    expect(dueLabel('2026-11-13T00:00:00.000Z', now)).toBe('ontem 21:00')
  })

  it('uses the day and month for other days, and the year when it differs', () => {
    expect(dueLabel('2026-11-20T12:00:00.000Z', now)).toBe('20/11 09:00')
    expect(dueLabel('2027-02-03T12:05:00.000Z', now)).toBe('03/02/2027 09:05')
  })
})

describe('toLocalInputValue', () => {
  it('fills a datetime-local field with the local date and time, to the minute', () => {
    expect(toLocalInputValue('2026-11-13T17:22:00.000Z')).toBe('2026-11-13T14:22')
    expect(toLocalInputValue('2027-01-01T02:50:59.000Z')).toBe('2026-12-31T23:50')
  })
})
