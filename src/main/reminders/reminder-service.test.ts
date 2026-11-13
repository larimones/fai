import { describe, expect, it, vi } from 'vitest'
import type { Reminder } from '@domain/reminders/reminders'
import { IpcRuleError } from '../ipc/invoke-handler'
import { createReminderService } from './reminder-service'

const ID_A = '6f1c2a4e-8b1d-4c3e-9f2a-1b2c3d4e5f60'
const ID_B = '7a2d3b5f-9c2e-4d4f-8a3b-2c3d4e5f6a71'
const UNKNOWN = '8b3e4c6a-ad3f-4e5a-9b4c-3d4e5f6a7b82'
const NOW = '2026-11-13T14:00:00.000Z'
const LATER = '2026-11-13T15:00:00.000Z'

const pending: Reminder = {
  id: ID_A,
  text: 'Tomar água',
  dueAt: LATER,
  createdAt: '2026-11-13T10:00:00.000Z',
  notifiedAt: null,
  late: false,
}

function setup(initial: readonly Reminder[] = []) {
  let stored = initial
  const store = {
    read: vi.fn(() => stored),
    write: vi.fn((reminders: readonly Reminder[]) => {
      stored = reminders
    }),
  }
  const onCreated = vi.fn()
  const service = createReminderService({
    store,
    newId: () => ID_B,
    now: () => NOW,
    onCreated,
  })
  return { service, store, onCreated, stored: () => stored }
}

function ruleError(run: () => unknown): IpcRuleError {
  try {
    run()
  } catch (error) {
    if (error instanceof IpcRuleError) {
      return error
    }
    throw error
  }
  throw new Error('expected a rule error')
}

describe('reminder service (RF-14, ADR-0016)', () => {
  it('lists the stored reminders', () => {
    expect(setup([pending]).service.list()).toEqual([pending])
  })

  it('creates a reminder with a new id and the current time, saves it, then lets the scheduler check', () => {
    const { service, stored, store, onCreated } = setup([pending])

    const reminder = service.create('  Ligar para a vó  ', LATER)

    expect(reminder).toEqual({
      id: ID_B,
      text: 'Ligar para a vó',
      dueAt: LATER,
      createdAt: NOW,
      notifiedAt: null,
      late: false,
    })
    expect(stored()).toEqual([pending, reminder])
    expect(onCreated).toHaveBeenCalledOnce()
    expect(store.write.mock.invocationCallOrder[0]).toBeLessThan(
      onCreated.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('refuses an invalid text or a time that is not in the future, in pt-BR, without saving (CA1)', () => {
    const { service, store, onCreated } = setup()

    expect(ruleError(() => service.create('   ', LATER))).toMatchObject({
      code: 'INVALID_TEXT',
      message: 'Escreva do que a Fai deve lembrar.',
    })
    expect(ruleError(() => service.create('a'.repeat(201), LATER))).toMatchObject({
      code: 'INVALID_TEXT',
      message: 'O lembrete pode ter até 200 caracteres.',
    })
    for (const dueAt of [NOW, '2026-11-13T13:59:59.000Z']) {
      expect(ruleError(() => service.create('Tomar água', dueAt))).toMatchObject({
        code: 'DUE_NOT_IN_FUTURE',
        message: 'Escolha um horário no futuro.',
      })
    }
    expect(store.write).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('deletes a reminder and saves the list', () => {
    const { service, stored } = setup([pending])

    service.delete(ID_A)

    expect(stored()).toEqual([])
  })

  it('reports a reminder that no longer exists, without saving', () => {
    const { service, store } = setup([pending])

    expect(
      ruleError(() => {
        service.delete(UNKNOWN)
      }),
    ).toMatchObject({ code: 'NOT_FOUND', message: 'Esse lembrete não existe mais.' })
    expect(store.write).not.toHaveBeenCalled()
  })
})
