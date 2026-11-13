import { useRef, useState } from 'react'
import { panelView, type Task } from '@domain/tasks/tasks'
import { TaskForm } from './TaskForm'
import { TaskRow } from './TaskRow'
import { applyChange, usePanelOpening } from './use-panel-opening'

interface TasksTabProps {
  readonly tasks: readonly Task[]
  readonly active: boolean
  readonly reload: () => Promise<void>
}

/** The "Tarefas" tab (RF-10..13): opens clean each time, with the completed tasks folded away. */
export function TasksTab({ tasks, active, reload }: TasksTabProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Each opening starts clean: completed folded, no question, no error.
  usePanelOpening('tasks', active, inputRef, () => {
    setShowCompleted(false)
    setConfirmingId(null)
    setError(null)
  })

  const apply = (change: Parameters<typeof applyChange>[0]) => applyChange(change, setError, reload)
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
    <>
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
    </>
  )
}
