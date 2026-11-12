import type { RefObject } from 'react'

interface TaskFormProps {
  readonly title: string
  readonly error: string | null
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly onTitleChange: (title: string) => void
  readonly onSubmit: () => void
}

/** The "new task" field: Enter or the + button creates (RF-11). */
export function TaskForm({ title, error, inputRef, onTitleChange, onSubmit }: TaskFormProps) {
  return (
    <form
      className="new-task"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="new-task__row">
        <input
          ref={inputRef}
          className="new-task__field"
          type="text"
          value={title}
          placeholder="O que vamos fazer hoje?"
          aria-label="Nova tarefa"
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : 'new-task-error'}
          onChange={(event) => {
            onTitleChange(event.target.value)
          }}
        />
        <button className="button button--accent" type="submit" aria-label="Adicionar tarefa">
          +
        </button>
      </div>
      {error !== null && (
        <p id="new-task-error" className="new-task__error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
