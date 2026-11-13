import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@domain/tasks/tasks'
import type { IpcResult, PanelApi } from '@shared/ipc/api'
import { PanelApp } from './PanelApp'

let counter = 0
const uuid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
const ok = <T,>(value: T): Promise<IpcResult<T>> => Promise.resolve({ ok: true, value })
const fail = <T,>(code: 'INVALID_TITLE' | 'NOT_FOUND', message: string): Promise<IpcResult<T>> =>
  Promise.resolve({ ok: false, error: { code, message } })

/** A fake main process: keeps the tasks and applies the same refusals. */
function installFakePanel(initial: Task[] = []) {
  let tasks = [...initial]
  let openedListener: ((tab: 'tasks' | 'reminders') => void) | undefined
  let clock = 0
  const now = () => new Date(Date.UTC(2026, 10, 12, 12, 0, clock++)).toISOString()
  const spies = {
    list: vi.fn(() => ok<readonly Task[]>(tasks)),
    create: vi.fn((title: string) => {
      if (title.trim() === '') {
        return fail<Task>('INVALID_TITLE', 'Escreva um título para a tarefa.')
      }
      const task: Task = { id: uuid(), title: title.trim(), createdAt: now(), completedAt: null }
      tasks = [...tasks, task]
      return ok(task)
    }),
    setDone: vi.fn((id: string, done: boolean) => {
      const current = tasks.find((task) => task.id === id)
      if (current === undefined) {
        return fail<Task>('NOT_FOUND', 'Essa tarefa não existe mais.')
      }
      const task = { ...current, completedAt: done ? now() : null }
      tasks = tasks.map((candidate) => (candidate.id === id ? task : candidate))
      return ok(task)
    }),
    delete: vi.fn((id: string) => {
      if (!tasks.some((task) => task.id === id)) {
        return fail<null>('NOT_FOUND', 'Essa tarefa não existe mais.')
      }
      tasks = tasks.filter((task) => task.id !== id)
      return ok(null)
    }),
  }
  const api: PanelApi = {
    tasks: spies,
    onOpened: (listener) => {
      openedListener = listener
      return () => {
        openedListener = undefined
      }
    },
  }
  vi.stubGlobal('faiPanel', api)
  return {
    spies,
    open: async () => {
      await act(async () => {
        openedListener?.('tasks')
        await Promise.resolve()
      })
    },
    removeBehindTheScenes: (id: string) => {
      tasks = tasks.filter((task) => task.id !== id)
    },
  }
}

function task(title: string, second: number, completedSecond: number | null = null): Task {
  return {
    id: uuid(),
    title,
    createdAt: new Date(Date.UTC(2026, 10, 1, 10, 0, second)).toISOString(),
    completedAt:
      completedSecond === null
        ? null
        : new Date(Date.UTC(2026, 10, 2, 10, 0, completedSecond)).toISOString(),
  }
}

async function renderPanel() {
  render(<PanelApp />)
  await act(async () => {
    await Promise.resolve()
  })
}

const pendingList = () => screen.getByRole('list', { name: 'Pendentes' })
const titlesIn = (list: HTMLElement) =>
  within(list)
    .queryAllByRole('listitem')
    .map((item) => item.textContent)

async function typeAndCreate(title: string, how: 'enter' | 'button' = 'enter') {
  const input = screen.getByRole('textbox', { name: 'Nova tarefa' })
  fireEvent.change(input, { target: { value: title } })
  await act(async () => {
    if (how === 'enter') {
      fireEvent.submit(input)
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }))
    }
    await Promise.resolve()
  })
}

describe('PanelApp (RF-10..13, RNF-10)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists pending tasks newest first and counts them', async () => {
    installFakePanel([task('Antiga', 1), task('Nova', 2)])
    await renderPanel()

    expect(titlesIn(pendingList())).toEqual([
      expect.stringContaining('Nova'),
      expect.stringContaining('Antiga'),
    ])
    expect(screen.getByText('2 pendentes')).toBeInTheDocument()
  })

  it('creates a task with Enter and with the button, putting it on top (RF-11 CA2)', async () => {
    installFakePanel([task('Antiga', 1)])
    await renderPanel()

    await typeAndCreate('Regar as plantas')
    await typeAndCreate('Ler um livro', 'button')

    expect(titlesIn(pendingList())[0]).toContain('Ler um livro')
    expect(titlesIn(pendingList())[1]).toContain('Regar as plantas')
    expect(screen.getByRole('textbox', { name: 'Nova tarefa' })).toHaveValue('')
  })

  it('shows the refusal from the main process and clears it when typing again (RF-11 CA1)', async () => {
    installFakePanel()
    await renderPanel()

    await typeAndCreate('   ')

    expect(screen.getByRole('alert')).toHaveTextContent('Escreva um título para a tarefa.')
    // The text stays, so it can be fixed instead of typed again.
    expect(screen.getByRole('textbox', { name: 'Nova tarefa' })).toHaveValue('   ')
    fireEvent.change(screen.getByRole('textbox', { name: 'Nova tarefa' }), {
      target: { value: 'R' },
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('completes a task into the completed section and reopens it (RF-12)', async () => {
    const { spies } = installFakePanel([task('Regar', 1)])
    await renderPanel()

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Concluir: Regar' }))
      await Promise.resolve()
    })

    expect(spies.setDone).toHaveBeenCalledWith(expect.any(String), true)
    expect(titlesIn(pendingList())).toEqual([])
    const toggle = screen.getByRole('button', { name: 'Concluídas (1)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Reabrir: Regar' }))
      await Promise.resolve()
    })

    expect(titlesIn(pendingList())).toEqual([expect.stringContaining('Regar')])
    expect(screen.getByRole('button', { name: 'Concluídas (0)' })).toBeInTheDocument()
  })

  it('asks before deleting: "Não" keeps the task, "Sim" deletes it (RF-13 CA1)', async () => {
    const { spies } = installFakePanel([task('Regar', 1)])
    await renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir: Regar' }))
    expect(screen.getByText('Excluir esta tarefa?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Não' }))
    expect(titlesIn(pendingList())).toEqual([expect.stringContaining('Regar')])
    expect(spies.delete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir: Regar' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sim' }))
      await Promise.resolve()
    })

    expect(titlesIn(pendingList())).toEqual([])
    expect(spies.delete).toHaveBeenCalledOnce()
  })

  it('starts clean each time it opens: list reloaded, completed collapsed, no question, field focused', async () => {
    const { spies, open } = installFakePanel([task('Regar', 1, 1), task('Ler', 2)])
    await renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Concluídas (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir: Ler' }))
    screen.getByRole('button', { name: 'Concluídas (1)' }).focus()
    spies.list.mockClear()

    await open()

    expect(spies.list).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Concluídas (1)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByText('Excluir esta tarefa?')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nova tarefa' })).toHaveFocus()
  })

  it('tells when a task no longer exists and reloads the list', async () => {
    const regar = task('Regar', 1)
    const { removeBehindTheScenes } = installFakePanel([regar])
    await renderPanel()
    removeBehindTheScenes(regar.id)

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Concluir: Regar' }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Essa tarefa não existe mais.')
    expect(titlesIn(pendingList())).toEqual([])
  })

  it('names every control for screen readers (RNF-10 CA2)', async () => {
    installFakePanel([task('Regar', 1)])
    await renderPanel()

    expect(screen.getByRole('heading', { name: /Tarefas da Fai/ })).toBeInTheDocument()
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName()
    }
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toHaveAccessibleName()
    }
  })
})
