import type { Reminder } from '@domain/reminders/reminders'

interface ReminderRowProps {
  readonly reminder: Reminder
  /** "hoje 15:30", "amanhã 09:00"… */
  readonly label: string
  readonly confirming: boolean
  readonly onAskDelete: () => void
  readonly onConfirmDelete: () => void
  readonly onCancelDelete: () => void
}

/** One reminder: its time, its text and ✕ to delete with a question in the row (RF-14 CA2). */
export function ReminderRow({
  reminder,
  label,
  confirming,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: ReminderRowProps) {
  if (confirming) {
    return (
      <li className="task task--ask">
        <span className="task__title">Excluir este lembrete?</span>
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
  const notified = reminder.notifiedAt !== null
  return (
    <li className={notified ? 'task task--done' : 'task'}>
      <span className="reminder__time">{label}</span>
      <span className="reminder__body">
        <span className="task__title">{reminder.text}</span>
        {/* Outside the struck text, so it stays readable (owner's review of the mockup). */}
        {reminder.late && <span className="reminder__late">atrasado</span>}
      </span>
      <button
        className="task__delete"
        type="button"
        aria-label={`Excluir: ${reminder.text}`}
        onClick={onAskDelete}
      >
        ✕
      </button>
    </li>
  )
}
