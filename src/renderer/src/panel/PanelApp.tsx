import { useCallback, useEffect, useRef, useState } from 'react'
import { panelView, type Task } from '@domain/tasks/tasks'
import type { IpcResult } from '@shared/ipc/api'
import { TaskForm } from './TaskForm'
import { TaskRow } from './TaskRow'

function pendingLabel(count: number): string {
  return count === 1 ? '1 pendente' : `${String(count)} pendentes`
}

/** The task panel (RF-10..13): opens clean each time, with the completed tasks folded away. */
export function PanelApp() {
  const [tasks, setTasks] = useState<readonly Task[]>([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async (): Promise<void> => {
    const result = await window.faiPanel.tasks.list()
    if (result.ok) {
      setTasks(result.value)
    }
  }, [])

  /** Applies a change from the main process; on refusal shows its message and resyncs the list. */
  const apply = useCallback(
    async (change: Promise<IpcResult<unknown>>): Promise<boolean> => {
      const result = await change
      if (!result.ok) {
        setError(result.error.message)
      }
      await reload()
      return result.ok
    },
    [reload],
  )

  useEffect(() => {
    let active = true
    const load = (): void => {
      void window.faiPanel.tasks.list().then((result) => {
        if (active && result.ok) {
          setTasks(result.value)
        }
      })
    }
    load()
    inputRef.current?.focus()
    // Each opening starts clean: fresh list, completed folded, no question, field focused.
    const stopListening = window.faiPanel.onOpened(() => {
      setShowCompleted(false)
      setConfirmingId(null)
      setError(null)
      load()
      inputRef.current?.focus()
    })
    return () => {
      active = false
      stopListening()
    }
  }, [])

  const { pending, completed } = panelView(tasks)

  const rowFor = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      confirming={confirmingId === task.id}
      onToggle={() => {
        void apply(window.faiPanel.tasks.setDone(task.id, task.completedAt === null))
      }}
      onAskDelete={() => {
        setConfirmingId(task.id)
      }}
      onConfirmDelete={() => {
        setConfirmingId(null)
        void apply(window.faiPanel.tasks.delete(task.id))
      }}
      onCancelDelete={() => {
        setConfirmingId(null)
      }}
    />
  )

  return (
    <main className="panel">
      <header className="panel__header">
        <h1 className="panel__title">✿ Tarefas da Fai</h1>
        <span className="panel__chip">{pendingLabel(pending.length)}</span>
      </header>

      <TaskForm
        title={title}
        error={error}
        inputRef={inputRef}
        onTitleChange={(next) => {
          setTitle(next)
          setError(null)
        }}
        onSubmit={() => {
          void apply(window.faiPanel.tasks.create(title)).then((created) => {
            if (created) {
              setTitle('')
            }
          })
        }}
      />

      <div className="panel__lists">
        <ul className="tasks" aria-label="Pendentes">
          {pending.map(rowFor)}
        </ul>
        {pending.length === 0 && (
          <p className="panel__empty">Nada por aqui. Que tal anotar algo?</p>
        )}

        <button
          className="completed-toggle"
          type="button"
          aria-expanded={showCompleted}
          aria-controls="completed-tasks"
          onClick={() => {
            setShowCompleted((open) => !open)
          }}
        >
          Concluídas ({completed.length})
        </button>
        {showCompleted && (
          <ul id="completed-tasks" className="tasks" aria-label="Concluídas">
            {completed.map(rowFor)}
          </ul>
        )}
      </div>

      <p className="panel__footer" aria-hidden="true">
        ✦ você consegue ✦
      </p>
    </main>
  )
}
