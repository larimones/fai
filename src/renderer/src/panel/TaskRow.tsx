import type { Task } from '@domain/tasks/tasks'

interface TaskRowProps {
  readonly task: Task
  readonly confirming: boolean
  readonly onToggle: () => void
  readonly onAskDelete: () => void
  readonly onConfirmDelete: () => void
  readonly onCancelDelete: () => void
}

/** One task: a round check to complete or reopen, and ✕ to delete with a question in the row (RF-12, RF-13). */
export function TaskRow({
  task,
  confirming,
  onToggle,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: TaskRowProps) {
  const done = task.completedAt !== null
  if (confirming) {
    return (
      <li className="task task--ask">
        <span className="task__title">Excluir esta tarefa?</span>
        <button
          className="button button--accent button--small"
          type="button"
          onClick={onConfirmDelete}
        >
          Sim
        </button>
        <button
          className="button button--plain button--small"
          type="button"
          onClick={onCancelDelete}
        >
          Não
        </button>
      </li>
    )
  }
  return (
    <li className={done ? 'task task--done' : 'task'}>
      <input
        className="task__check"
        type="checkbox"
        checked={done}
        aria-label={`${done ? 'Reabrir' : 'Concluir'}: ${task.title}`}
        onChange={onToggle}
      />
      <span className="task__title">{task.title}</span>
      <button
        className="task__delete"
        type="button"
        aria-label={`Excluir: ${task.title}`}
        onClick={onAskDelete}
      >
        ✕
      </button>
    </li>
  )
}
