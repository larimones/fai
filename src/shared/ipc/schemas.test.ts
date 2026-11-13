import { describe, expect, it } from 'vitest'
import { IpcChannels } from './channels'
import { eventContract, invokeContract, sendContract } from './schemas'

describe('mascot message schemas (RNF-03)', () => {
  const setInteractive = sendContract[IpcChannels.mascotSetInteractive]
  const drag = sendContract[IpcChannels.mascotDrag]

  it('accepts the declared messages', () => {
    expect(setInteractive.safeParse({ interactive: true }).success).toBe(true)
    expect(setInteractive.safeParse({ interactive: false }).success).toBe(true)
    for (const phase of ['start', 'move', 'end']) {
      expect(drag.safeParse({ phase }).success).toBe(true)
    }
  })

  it('rejects extra fields, such as coordinates chosen by the renderer', () => {
    expect(setInteractive.safeParse({ interactive: true, x: 1 }).success).toBe(false)
    expect(drag.safeParse({ phase: 'move', screenX: 10, screenY: 20 }).success).toBe(false)
  })

  it('rejects wrong types, unknown phases and missing payloads', () => {
    expect(setInteractive.safeParse({ interactive: 'true' }).success).toBe(false)
    expect(setInteractive.safeParse(undefined).success).toBe(false)
    expect(drag.safeParse({ phase: 'teleport' }).success).toBe(false)
    expect(drag.safeParse({}).success).toBe(false)
    expect(drag.safeParse('start').success).toBe(false)
  })
})

describe('mascot menu and reaction messages (ADR-0014)', () => {
  it('opens the menu with no payload at all', () => {
    const openMenu = sendContract[IpcChannels.mascotOpenMenu]

    expect(openMenu.safeParse(undefined).success).toBe(true)
    expect(openMenu.safeParse({ x: 10 }).success).toBe(false)
  })

  it('knows the celebrate and reminder reactions, and the panel opens on a known tab', () => {
    const reaction = eventContract[IpcChannels.mascotReaction]
    const opened = eventContract[IpcChannels.panelOpened]

    expect(reaction.safeParse({ kind: 'celebrate' }).success).toBe(true)
    expect(reaction.safeParse({ kind: 'reminder' }).success).toBe(true)
    expect(reaction.safeParse({ kind: 'dance' }).success).toBe(false)
    expect(reaction.safeParse({ kind: 'celebrate', extra: 1 }).success).toBe(false)
    expect(opened.safeParse({ tab: 'tasks' }).success).toBe(true)
    expect(opened.safeParse({ tab: 'reminders' }).success).toBe(true)
    expect(opened.safeParse({ tab: 'settings' }).success).toBe(false)
    expect(opened.safeParse(undefined).success).toBe(false)
  })
})

describe('reminder channels (CA14, ADR-0016)', () => {
  const ID = '8b3e4c6a-ad3f-4e5a-9b4c-3d4e5f6a7b82'
  const reminder = {
    id: ID,
    text: 'tomar água',
    dueAt: '2026-11-13T18:30:00.000Z',
    createdAt: '2026-11-13T17:00:00.000Z',
    notifiedAt: null,
    late: false,
  }
  const list = invokeContract[IpcChannels.remindersList]
  const create = invokeContract[IpcChannels.remindersCreate]
  const remove = invokeContract[IpcChannels.remindersDelete]
  const changed = eventContract[IpcChannels.remindersChanged]

  it('accepts the declared requests and responses', () => {
    expect(list.request.safeParse(undefined).success).toBe(true)
    expect(create.request.safeParse({ text: ' tomar água ', dueAt: reminder.dueAt }).success).toBe(
      true,
    )
    // The text rule and "in the future" are the domain's; the contract checks the shape.
    expect(create.request.safeParse({ text: '', dueAt: '2000-01-01T00:00:00.000Z' }).success).toBe(
      true,
    )
    expect(remove.request.safeParse({ id: ID }).success).toBe(true)
    expect(
      list.response.safeParse([reminder, { ...reminder, notifiedAt: reminder.dueAt, late: true }])
        .success,
    ).toBe(true)
    expect(create.response.safeParse(reminder).success).toBe(true)
    expect(remove.response.safeParse(null).success).toBe(true)
    expect(changed.safeParse(undefined).success).toBe(true)
  })

  it('rejects extra fields, wrong types, oversized texts, bad instants and bad ids', () => {
    for (const [schema, payload] of [
      [create.request, { text: 'x'.repeat(1001), dueAt: reminder.dueAt }],
      [create.request, { text: 'ok', dueAt: 'amanhã às 9' }],
      [create.request, { text: 'ok', dueAt: '2026-11-13T18:30' }],
      [create.request, { text: 'ok' }],
      [create.request, { text: 'ok', dueAt: reminder.dueAt, repeat: true }],
      [remove.request, { id: 'not-a-uuid' }],
      [list.request, { all: true }],
      [create.response, { ...reminder, late: 'no' }],
      [create.response, { ...reminder, secret: 1 }],
      [changed, { count: 1 }],
    ] as const) {
      expect(schema.safeParse(payload).success).toBe(false)
    }
  })
})

describe('task channels (CA16, ADR-0014)', () => {
  const ID = '6f1c2a4e-8b1d-4c3e-9f2a-1b2c3d4e5f60'
  const task = {
    id: ID,
    title: 'Regar as plantas',
    createdAt: '2026-11-06T12:00:00.000Z',
    completedAt: null,
  }
  const list = invokeContract[IpcChannels.tasksList]
  const create = invokeContract[IpcChannels.tasksCreate]
  const setDone = invokeContract[IpcChannels.tasksSetDone]
  const remove = invokeContract[IpcChannels.tasksDelete]

  it('accepts the declared requests', () => {
    expect(list.request.safeParse(undefined).success).toBe(true)
    expect(create.request.safeParse({ title: '  Nova tarefa  ' }).success).toBe(true)
    // The title rule (trim, 1 to 200) is the domain's; the contract only caps the size.
    expect(create.request.safeParse({ title: '' }).success).toBe(true)
    expect(setDone.request.safeParse({ id: ID, done: true }).success).toBe(true)
    expect(remove.request.safeParse({ id: ID }).success).toBe(true)
  })

  it('rejects extra fields, wrong types, oversized titles and ids that are not UUIDs', () => {
    for (const [schema, payload] of [
      [list.request, { all: true }],
      [create.request, { title: 'x'.repeat(1001) }],
      [create.request, { title: 42 }],
      [create.request, { title: 'ok', id: ID }],
      [create.request, undefined],
      [setDone.request, { id: ID, done: 'yes' }],
      [setDone.request, { id: '../../etc', done: true }],
      [setDone.request, { id: ID }],
      [remove.request, { id: 'not-a-uuid' }],
      [remove.request, { id: ID, force: true }],
    ] as const) {
      expect(schema.safeParse(payload).success).toBe(false)
    }
  })

  it('describes the responses', () => {
    expect(
      list.response.safeParse([task, { ...task, completedAt: '2026-11-06T13:00:00.000Z' }]).success,
    ).toBe(true)
    expect(create.response.safeParse(task).success).toBe(true)
    expect(setDone.response.safeParse(task).success).toBe(true)
    expect(remove.response.safeParse(null).success).toBe(true)
    expect(create.response.safeParse({ ...task, secret: 'x' }).success).toBe(false)
    expect(create.response.safeParse({ ...task, createdAt: 'ontem' }).success).toBe(false)
    expect(create.response.safeParse({ ...task, title: '' }).success).toBe(false)
  })
})
