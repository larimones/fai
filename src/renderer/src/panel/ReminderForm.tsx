import type { RefObject } from 'react'
import type { QuickTimes } from '@domain/reminders/time'

export type Shortcut = keyof QuickTimes

const SHORTCUTS: readonly (readonly [Shortcut, string])[] = [
  ['in15Minutes', 'em 15 min'],
  ['in1Hour', 'em 1 h'],
  ['tomorrowAt9', 'amanhã 9h'],
]

interface ReminderFormProps {
  readonly text: string
  /** The `datetime-local` value, local time; the only source of the reminder's time. */
  readonly when: string
  /** The shortcut that filled `when`, if it was not edited since. */
  readonly picked: Shortcut | null
  readonly error: string | null
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly onTextChange: (text: string) => void
  readonly onWhenChange: (when: string) => void
  readonly onPick: (shortcut: Shortcut) => void
  readonly onSubmit: () => void
}

/** The "new reminder" form: text, shortcuts that fill the date and time field, and + (RF-14). */
export function ReminderForm(props: ReminderFormProps) {
  const { text, when, picked, error, inputRef } = props
  return (
    <form
      className="new-task"
      onSubmit={(event) => {
        event.preventDefault()
        props.onSubmit()
      }}
    >
      <div className="new-task__row">
        <input
          ref={inputRef}
          className="new-task__field"
          type="text"
          value={text}
          placeholder="Me lembre de…"
          aria-label="Novo lembrete"
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : 'new-reminder-error'}
          onChange={(event) => {
            props.onTextChange(event.target.value)
          }}
        />
        <button className="button button--accent" type="submit" aria-label="Adicionar lembrete">
          +
        </button>
      </div>
      <div className="when">
        {SHORTCUTS.map(([shortcut, label]) => (
          <button
            key={shortcut}
            className="when__shortcut"
            type="button"
            aria-pressed={picked === shortcut}
            onClick={() => {
              props.onPick(shortcut)
            }}
          >
            {label}
          </button>
        ))}
        <input
          className="when__field"
          type="datetime-local"
          value={when}
          aria-label="Quando"
          onChange={(event) => {
            props.onWhenChange(event.target.value)
          }}
        />
      </div>
      {error !== null && (
        <p id="new-reminder-error" className="new-task__error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
