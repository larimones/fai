import { describe, expect, it, vi } from 'vitest'
import type { Task } from '@domain/tasks/tasks'
import { IpcRuleError } from '../ipc/invoke-handler'
import { createTaskService } from './task-service'

const ID_A = '6f1c2a4e-8b1d-4c3e-9f2a-1b2c3d4e5f60'
const ID_B = '7a2d3b5f-9c2e-4d4f-8a3b-2c3d4e5f6a71'
const UNKNOWN = '8b3e4c6a-ad3f-4e5a-9b4c-3d4e5f6a7b82'
const NOW = '2026-11-12T14:00:00.000Z'

function setup(initial: readonly Task[] = []) {
  let stored = initial
  const store = {
    read: vi.fn(() => stored),
    write: vi.fn((tasks: readonly Task[]) => {
      stored = tasks
    }),
  }
  const celebrate = vi.fn()
  const service = createTaskService({
    store,
    newId: () => ID_B,
    now: () => NOW,
    celebrate,
  })
  return { service, store, celebrate, stored: () => stored }
}

const pending: Task = {
  id: ID_A,
  title: 'Regar',
  createdAt: '2026-11-12T10:00:00.000Z',
  completedAt: null,
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

describe('task service (RF-11, RF-12, RF-13, RF-17)', () => {
  it('lists the stored tasks', () => {
    expect(setup([pending]).service.list()).toEqual([pending])
  })

  it('creates a task with a new id and the current time, and saves it', () => {
    const { service, stored } = setup([pending])

    const task = service.create('  Ler um livro  ')

    expect(task).toEqual({ id: ID_B, title: 'Ler um livro', createdAt: NOW, completedAt: null })
    expect(stored()).toEqual([pending, task])
  })

  it('refuses an invalid title with a message in pt-BR, without saving', () => {
    const { service, store } = setup()

    expect(ruleError(() => service.create('   '))).toMatchObject({
      code: 'INVALID_TITLE',
      message: 'Escreva um título para a tarefa.',
    })
    expect(ruleError(() => service.create('a'.repeat(201)))).toMatchObject({
      code: 'INVALID_TITLE',
      message: 'O título pode ter até 200 caracteres.',
    })
    expect(store.write).not.toHaveBeenCalled()
  })

  it('completes a task, saves it and makes Fai celebrate once', () => {
    const { service, stored, celebrate } = setup([pending])

    const task = service.setDone(ID_A, true)

    expect(task.completedAt).toBe(NOW)
    expect(stored()).toEqual([task])
    expect(celebrate).toHaveBeenCalledOnce()
  })

  it('reopens a task without celebrating', () => {
    const { service, celebrate } = setup([{ ...pending, completedAt: NOW }])

    expect(service.setDone(ID_A, false).completedAt).toBeNull()
    expect(celebrate).not.toHaveBeenCalled()
  })

  it('does not celebrate again for a task that was already completed', () => {
    const { service, celebrate } = setup([{ ...pending, completedAt: NOW }])

    service.setDone(ID_A, true)

    expect(celebrate).not.toHaveBeenCalled()
  })

  it('deletes a task and saves the list', () => {
    const { service, stored } = setup([pending])

    service.delete(ID_A)

    expect(stored()).toEqual([])
  })

  it('reports a task that no longer exists, without saving or celebrating', () => {
    const { service, store, celebrate } = setup([pending])

    const attempts = [
      () => service.setDone(UNKNOWN, true),
      () => {
        service.delete(UNKNOWN)
      },
    ]
    for (const run of attempts) {
      expect(ruleError(run)).toMatchObject({
        code: 'NOT_FOUND',
        message: 'Essa tarefa não existe mais.',
      })
    }
    expect(store.write).not.toHaveBeenCalled()
    expect(celebrate).not.toHaveBeenCalled()
  })
})
