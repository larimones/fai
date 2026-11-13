import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Reminder } from '@domain/reminders/reminders'
import { installFakePanel, NOW, uuid } from './fake-panel-api'
import { PanelApp } from './PanelApp'

// Vitest runs in America/Sao_Paulo (UTC-3): NOW is 14:00 local time.

function reminder(text: string, dueAt: string, notifiedAt: string | null = null, late = false) {
  return {
    id: uuid(),
    text,
    dueAt,
    createdAt: '2026-11-13T12:00:00.000Z',
    notifiedAt,
    late,
  } satisfies Reminder
}

async function renderPanel() {
  render(<PanelApp now={() => NOW} />)
  await act(async () => {
    await Promise.resolve()
  })
}

const tab = (name: string) => screen.getByRole('tab', { name })
const remindersPanel = () => screen.getByRole('tabpanel', { name: 'Lembretes' })
const pendingReminders = () => screen.getByRole('list', { name: 'Lembretes pendentes' })
const rowsIn = (list: HTMLElement) =>
  within(list)
    .queryAllByRole('listitem')
    .map((item) => item.textContent)

async function showReminders() {
  await act(async () => {
    fireEvent.click(tab('Lembretes'))
    await Promise.resolve()
  })
}

async function submitReminder() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar lembrete' }))
    await Promise.resolve()
  })
}

describe('panel tabs (ADR-0016, CA10)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts on "Tarefas" and switches with a click', async () => {
    installFakePanel()
    await renderPanel()

    expect(tab('Tarefas')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Tarefas' })).toBeVisible()
    expect(screen.queryByRole('tabpanel', { name: 'Lembretes' })).not.toBeInTheDocument()

    await showReminders()

    expect(tab('Lembretes')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Tarefas')).toHaveAttribute('aria-selected', 'false')
    expect(remindersPanel()).toBeVisible()
  })

  it('moves between tabs with the arrow keys, Home and End, keeping one tab in the Tab order', async () => {
    installFakePanel()
    await renderPanel()
    tab('Tarefas').focus()

    fireEvent.keyDown(tab('Tarefas'), { key: 'ArrowRight' })
    expect(tab('Lembretes')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Lembretes')).toHaveFocus()
    expect(tab('Lembretes')).toHaveAttribute('tabindex', '0')
    expect(tab('Tarefas')).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(tab('Lembretes'), { key: 'ArrowRight' })
    expect(tab('Tarefas')).toHaveFocus()
    fireEvent.keyDown(tab('Tarefas'), { key: 'ArrowLeft' })
    expect(tab('Lembretes')).toHaveFocus()
    fireEvent.keyDown(tab('Lembretes'), { key: 'Home' })
    expect(tab('Tarefas')).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(tab('Tarefas'), { key: 'End' })
    expect(tab('Lembretes')).toHaveAttribute('aria-selected', 'true')
  })

  it('opens on the tab the main process asks for, with its field focused (CA5, CA10)', async () => {
    const { open } = installFakePanel()
    await renderPanel()

    await open('reminders')
    expect(tab('Lembretes')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Novo lembrete' })).toHaveFocus()

    await open('tasks')
    expect(tab('Tarefas')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Nova tarefa' })).toHaveFocus()
  })

  it('stops listening when it goes away', async () => {
    const { listening } = installFakePanel()
    const view = render(<PanelApp now={() => NOW} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(listening()).toBeGreaterThan(0)

    view.unmount()

    expect(listening()).toBe(0)
  })
})

describe('reminders tab (RF-14, CA2, CA3, CA9)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists pending reminders soonest first, with their time, and counts them (CA2)', async () => {
    installFakePanel({
      reminders: [
        reminder('ligar pra mãe', '2026-11-13T21:00:00.000Z'),
        reminder('tomar água', '2026-11-13T18:30:00.000Z'),
        reminder('pagar a luz', '2026-11-14T12:00:00.000Z'),
      ],
    })
    await renderPanel()
    await showReminders()

    expect(rowsIn(pendingReminders())).toEqual([
      expect.stringContaining('hoje 15:30tomar água'),
      expect.stringContaining('hoje 18:00ligar pra mãe'),
      expect.stringContaining('amanhã 09:00pagar a luz'),
    ])
    expect(screen.getByText('3 lembretes')).toBeInTheDocument()
  })

  it('creates with a shortcut, which fills the date and time field (CA3)', async () => {
    const { reminderSpies } = installFakePanel()
    await renderPanel()
    await showReminders()

    fireEvent.change(screen.getByRole('textbox', { name: 'Novo lembrete' }), {
      target: { value: 'tomar água' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'em 15 min' }))
    expect(screen.getByLabelText('Quando')).toHaveValue('2026-11-13T14:15')
    expect(screen.getByRole('button', { name: 'em 15 min' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'em 1 h' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'amanhã 9h' }))
    expect(screen.getByLabelText('Quando')).toHaveValue('2026-11-14T09:00')
    fireEvent.click(screen.getByRole('button', { name: 'em 1 h' }))
    await submitReminder()

    expect(reminderSpies.create).toHaveBeenCalledExactlyOnceWith(
      'tomar água',
      '2026-11-13T18:00:00.000Z',
    )
    expect(rowsIn(pendingReminders())).toEqual([expect.stringContaining('hoje 15:00tomar água')])
    expect(screen.getByRole('textbox', { name: 'Novo lembrete' })).toHaveValue('')
    expect(screen.getByLabelText('Quando')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'em 1 h' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('creates with the date and time field, read in local time', async () => {
    const { reminderSpies } = installFakePanel()
    await renderPanel()
    await showReminders()

    fireEvent.change(screen.getByRole('textbox', { name: 'Novo lembrete' }), {
      target: { value: 'dentista' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'em 15 min' }))
    fireEvent.change(screen.getByLabelText('Quando'), { target: { value: '2026-11-20T08:30' } })
    expect(screen.getByRole('button', { name: 'em 15 min' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await submitReminder()

    expect(reminderSpies.create).toHaveBeenCalledExactlyOnceWith(
      'dentista',
      '2026-11-20T11:30:00.000Z',
    )
  })

  it('asks for a time before sending, and shows the refusals from the main process (CA1)', async () => {
    const { reminderSpies } = installFakePanel()
    await renderPanel()
    await showReminders()
    const text = screen.getByRole('textbox', { name: 'Novo lembrete' })
    fireEvent.change(text, { target: { value: 'tomar água' } })

    await submitReminder()
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha quando lembrar.')
    expect(reminderSpies.create).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Quando'), { target: { value: '2026-11-13T13:00' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await submitReminder()
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha um horário no futuro.')

    fireEvent.change(text, { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('Quando'), { target: { value: '2026-11-13T15:00' } })
    await submitReminder()
    expect(screen.getByRole('alert')).toHaveTextContent('Escreva do que a Fai deve lembrar.')
    // What was typed stays, so it can be fixed.
    expect(text).toHaveValue('   ')
  })

  it('folds the announced ones under "Avisados (N)", latest first, with "atrasado" outside the struck text (CA9)', async () => {
    const { open } = installFakePanel({
      reminders: [
        reminder('regar', '2026-11-12T23:00:00.000Z', '2026-11-12T23:00:05.000Z'),
        reminder('remédio', '2026-11-13T11:00:00.000Z', '2026-11-13T13:00:00.000Z', true),
      ],
    })
    await renderPanel()
    await showReminders()
    const toggle = screen.getByRole('button', { name: 'Avisados (2)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Avisados' })).not.toBeInTheDocument()
    expect(screen.getByText('Nenhum lembrete pendente.')).toBeInTheDocument()

    fireEvent.click(toggle)

    const notified = screen.getByRole('list', { name: 'Avisados' })
    expect(rowsIn(notified)).toEqual([
      expect.stringContaining('remédio'),
      expect.stringContaining('regar'),
    ])
    const late = within(notified).getByText('atrasado')
    expect(within(notified).getByText('remédio')).not.toContainElement(late)
    expect(within(notified).getAllByText('atrasado')).toHaveLength(1)

    await open('reminders')
    expect(screen.getByRole('button', { name: 'Avisados (2)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('asks before deleting: "Não" keeps the reminder, "Sim" deletes it', async () => {
    const { reminderSpies } = installFakePanel({
      reminders: [reminder('tomar água', '2026-11-13T18:30:00.000Z')],
    })
    await renderPanel()
    await showReminders()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir: tomar água' }))
    expect(screen.getByText('Excluir este lembrete?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Não' }))
    expect(reminderSpies.delete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir: tomar água' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sim' }))
      await Promise.resolve()
    })

    expect(reminderSpies.delete).toHaveBeenCalledOnce()
    expect(rowsIn(pendingReminders())).toEqual([])
  })

  it('reloads when the main process announces a reminder', async () => {
    const water = reminder('tomar água', '2026-11-13T18:30:00.000Z')
    const { changeReminders } = installFakePanel({ reminders: [water] })
    await renderPanel()
    await showReminders()

    await changeReminders([{ ...water, notifiedAt: '2026-11-13T18:30:04.000Z' }])

    expect(rowsIn(pendingReminders())).toEqual([])
    expect(screen.getByRole('button', { name: 'Avisados (1)' })).toBeInTheDocument()
  })

  it('names every control for screen readers (RNF-10, CA13)', async () => {
    installFakePanel({ reminders: [reminder('tomar água', '2026-11-13T18:30:00.000Z')] })
    await renderPanel()
    await showReminders()

    for (const button of within(remindersPanel()).getAllByRole('button')) {
      expect(button).toHaveAccessibleName()
    }
    expect(screen.getByRole('tablist', { name: 'Seções do painel' })).toBeInTheDocument()
  })
})
