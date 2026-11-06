import { describe, expect, it } from 'vitest'
import {
  createTask,
  deleteTask,
  panelView,
  setTaskDone,
  type Task,
  TITLE_MAX_LENGTH,
  validateTitle,
} from './tasks'

const ID_A = '6f1c2a4e-8b1d-4c3e-9f2a-1b2c3d4e5f60'
const ID_B = '7a2d3b5f-9c2e-4d4f-8a3b-2c3d4e5f6a71'
const ID_C = '8b3e4c6a-ad3f-4e5a-9b4c-3d4e5f6a7b82'

function task(
  id: string,
  title: string,
  createdAt: string,
  completedAt: string | null = null,
): Task {
  return { id, title, createdAt, completedAt }
}

function frozen<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(frozen)
    Object.freeze(value)
  }
  return value
}

describe('validateTitle (RF-11 CA1)', () => {
  it('trims the title and accepts 1 to 200 characters', () => {
    expect(validateTitle('  Regar as plantas \n')).toEqual({ ok: true, title: 'Regar as plantas' })
    expect(validateTitle('a')).toEqual({ ok: true, title: 'a' })
    expect(validateTitle('a'.repeat(TITLE_MAX_LENGTH))).toMatchObject({ ok: true })
  })

  it('rejects an empty or blank title', () => {
    expect(validateTitle('')).toEqual({ ok: false, code: 'INVALID_TITLE', reason: 'EMPTY' })
    expect(validateTitle(' \t\n ')).toEqual({ ok: false, code: 'INVALID_TITLE', reason: 'EMPTY' })
  })

  it('rejects more than 200 characters, counting an emoji as one', () => {
    expect(TITLE_MAX_LENGTH).toBe(200)
    expect(validateTitle('a'.repeat(201))).toEqual({
      ok: false,
      code: 'INVALID_TITLE',
      reason: 'TOO_LONG',
    })
    // 200 emoji are 400 UTF-16 units, but 200 characters.
    expect(validateTitle('✨'.repeat(100) + '🧚'.repeat(100))).toMatchObject({ ok: true })
    expect(validateTitle('🧚'.repeat(201))).toMatchObject({ ok: false, reason: 'TOO_LONG' })
  })
})

describe('createTask (RF-11)', () => {
  it('adds a pending task with the given id and time, without changing the input', () => {
    const tasks = frozen([task(ID_A, 'Antiga', '2026-11-06T10:00:00.000Z')])

    const result = createTask(tasks, {
      id: ID_B,
      title: '  Nova  ',
      now: '2026-11-06T12:00:00.000Z',
    })

    expect(result).toEqual({
      ok: true,
      task: task(ID_B, 'Nova', '2026-11-06T12:00:00.000Z'),
      tasks: [tasks[0], task(ID_B, 'Nova', '2026-11-06T12:00:00.000Z')],
    })
  })

  it('does not create a task with an invalid title', () => {
    expect(createTask([], { id: ID_A, title: '   ', now: '2026-11-06T12:00:00.000Z' })).toEqual({
      ok: false,
      code: 'INVALID_TITLE',
      reason: 'EMPTY',
    })
  })
})

describe('setTaskDone (RF-12 CA1)', () => {
  const tasks = frozen([
    task(ID_A, 'Pendente', '2026-11-06T10:00:00.000Z'),
    task(ID_B, 'Feita', '2026-11-06T09:00:00.000Z', '2026-11-06T11:00:00.000Z'),
  ])

  it('records completedAt when completing', () => {
    const result = setTaskDone(tasks, ID_A, true, '2026-11-06T12:00:00.000Z')

    expect(result).toMatchObject({
      ok: true,
      task: { id: ID_A, completedAt: '2026-11-06T12:00:00.000Z' },
    })
    expect(result.ok && result.tasks[1]).toBe(tasks[1])
  })

  it('clears completedAt when reopening', () => {
    expect(setTaskDone(tasks, ID_B, false, '2026-11-06T12:00:00.000Z')).toMatchObject({
      ok: true,
      task: { id: ID_B, completedAt: null },
    })
  })

  it('keeps the first completion time when completing twice', () => {
    expect(setTaskDone(tasks, ID_B, true, '2026-11-06T12:00:00.000Z')).toMatchObject({
      ok: true,
      task: { completedAt: '2026-11-06T11:00:00.000Z' },
    })
  })

  it('reports an unknown id and leaves the list as it was', () => {
    expect(setTaskDone(tasks, ID_C, true, '2026-11-06T12:00:00.000Z')).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    })
  })
})

describe('deleteTask (RF-13 CA2)', () => {
  const tasks = frozen([
    task(ID_A, 'Uma', '2026-11-06T10:00:00.000Z'),
    task(ID_B, 'Outra', '2026-11-06T11:00:00.000Z'),
  ])

  it('removes the task', () => {
    expect(deleteTask(tasks, ID_A)).toEqual({ ok: true, tasks: [tasks[1]] })
  })

  it('reports an unknown id and leaves the list as it was', () => {
    expect(deleteTask(tasks, ID_C)).toEqual({ ok: false, code: 'NOT_FOUND' })
  })
})

describe('panelView (RF-11 CA2)', () => {
  it('lists pending tasks newest first and completed ones by completion, latest first', () => {
    const tasks = [
      task('p-old', 'Pendente antiga', '2026-11-01T10:00:00.000Z'),
      task('c-first', 'Concluída primeiro', '2026-11-02T10:00:00.000Z', '2026-11-03T10:00:00.000Z'),
      task('p-new', 'Pendente nova', '2026-11-05T10:00:00.000Z'),
      task(
        'c-last',
        'Concluída por último',
        '2026-11-01T09:00:00.000Z',
        '2026-11-04T10:00:00.000Z',
      ),
    ]

    const view = panelView(tasks)

    expect(view.pending.map((t) => t.id)).toEqual(['p-new', 'p-old'])
    expect(view.completed.map((t) => t.id)).toEqual(['c-last', 'c-first'])
  })

  it('puts the later-created task first when two share the same time', () => {
    const tasks = [
      task('first', 'Primeira', '2026-11-06T10:00:00.000Z'),
      task('second', 'Segunda', '2026-11-06T10:00:00.000Z'),
    ]

    expect(panelView(tasks).pending.map((t) => t.id)).toEqual(['second', 'first'])
  })
})
