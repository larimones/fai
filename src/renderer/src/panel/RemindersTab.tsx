import { useRef, useState } from 'react'
import { type Reminder, reminderView } from '@domain/reminders/reminders'
import { dueLabel, quickTimes, toLocalInputValue } from '@domain/reminders/time'
import { ReminderForm, type Shortcut } from './ReminderForm'
import { ReminderRow } from './ReminderRow'
import { applyChange, usePanelOpening } from './use-panel-opening'

interface RemindersTabProps {
  readonly reminders: readonly Reminder[]
  /** When the list was loaded: "hoje" and "amanhã" are counted from here. */
  readonly loadedAt: string
  readonly active: boolean
  readonly now: () => string
  readonly reload: () => Promise<void>
}

/** The "Lembretes" tab (RF-14, ADR-0016): pending soonest first, announced ones folded away. */
export function RemindersTab({ reminders, loadedAt, active, now, reload }: RemindersTabProps) {
  const [text, setText] = useState('')
  const [when, setWhen] = useState('')
  const [picked, setPicked] = useState<Shortcut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showNotified, setShowNotified] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Each opening starts clean: announced folded, no question, no error.
  usePanelOpening('reminders', active, inputRef, () => {
    setShowNotified(false)
    setConfirmingId(null)
    setError(null)
  })

  const apply = (change: Parameters<typeof applyChange>[0]) => applyChange(change, setError, reload)
  const { pending, notified } = reminderView(reminders)

  const submit = (): void => {
    // A datetime-local value has no time zone: `Date` reads it as local time.
    const dueAt = when === '' ? Number.NaN : new Date(when).getTime()
    if (Number.isNaN(dueAt)) {
      setError('Escolha quando lembrar.')
      return
    }
    void apply(window.faiPanel.reminders.create(text, new Date(dueAt).toISOString())).then(
      (created) => {
        if (created) {
          setText('')
          setWhen('')
          setPicked(null)
        }
      },
    )
  }

  const rowFor = (reminder: Reminder) => (
    <ReminderRow
      key={reminder.id}
      reminder={reminder}
      label={dueLabel(reminder.dueAt, loadedAt)}
      confirming={confirmingId === reminder.id}
      onAskDelete={() => {
        setConfirmingId(reminder.id)
      }}
      onConfirmDelete={() => {
        setConfirmingId(null)
        void apply(window.faiPanel.reminders.delete(reminder.id))
      }}
      onCancelDelete={() => {
        setConfirmingId(null)
      }}
    />
  )

  return (
    <>
      <ReminderForm
        text={text}
        when={when}
        picked={picked}
        error={error}
        inputRef={inputRef}
        onTextChange={(next) => {
          setText(next)
          setError(null)
        }}
        onWhenChange={(next) => {
          setWhen(next)
          setPicked(null)
          setError(null)
        }}
        onPick={(shortcut) => {
          setWhen(toLocalInputValue(quickTimes(now())[shortcut]))
          setPicked(shortcut)
          setError(null)
        }}
        onSubmit={submit}
      />

      <div className="panel__lists">
        <ul className="tasks" aria-label="Lembretes pendentes">
          {pending.map(rowFor)}
        </ul>
        {pending.length === 0 && <p className="panel__empty">Nenhum lembrete pendente.</p>}

        <button
          className="completed-toggle"
          type="button"
          aria-expanded={showNotified}
          aria-controls="notified-reminders"
          onClick={() => {
            setShowNotified((open) => !open)
          }}
        >
          Avisados ({notified.length})
        </button>
        {showNotified && (
          <ul id="notified-reminders" className="tasks" aria-label="Avisados">
            {notified.map(rowFor)}
          </ul>
        )}
      </div>
    </>
  )
}
