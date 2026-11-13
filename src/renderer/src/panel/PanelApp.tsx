import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { type Reminder, reminderView } from '@domain/reminders/reminders'
import { panelView, type Task } from '@domain/tasks/tasks'
import type { PanelTab } from '@shared/ipc/api'
import { RemindersTab } from './RemindersTab'
import { TasksTab } from './TasksTab'

const TABS: readonly (readonly [PanelTab, string])[] = [
  ['tasks', 'Tarefas'],
  ['reminders', 'Lembretes'],
]

const plural = (count: number, one: string, many: string): string =>
  count === 1 ? `1 ${one}` : `${String(count)} ${many}`

const currentInstant = (): string => new Date().toISOString()

interface PanelAppProps {
  /** The current instant, ISO 8601 in UTC; tests fix it. */
  readonly now?: () => string
}

/** Fai's panel: "Tarefas" and "Lembretes" tabs (ADR-0014, ADR-0016). */
export function PanelApp({ now = currentInstant }: PanelAppProps) {
  const [tab, setTab] = useState<PanelTab>('tasks')
  const [tasks, setTasks] = useState<readonly Task[]>([])
  const [reminders, setReminders] = useState<{
    readonly list: readonly Reminder[]
    readonly loadedAt: string
  }>(() => ({ list: [], loadedAt: now() }))
  const tabRefs = useRef(new Map<PanelTab, HTMLButtonElement>())

  const reloadTasks = useCallback(async (): Promise<void> => {
    const result = await window.faiPanel.tasks.list()
    if (result.ok) {
      setTasks(result.value)
    }
  }, [])

  const reloadReminders = useCallback(async (): Promise<void> => {
    const result = await window.faiPanel.reminders.list()
    if (result.ok) {
      setReminders({ list: result.value, loadedAt: now() })
    }
  }, [now])

  useEffect(() => {
    let active = true
    const loadTasks = (): void => {
      void window.faiPanel.tasks.list().then((result) => {
        if (active && result.ok) {
          setTasks(result.value)
        }
      })
    }
    const loadReminders = (): void => {
      void window.faiPanel.reminders.list().then((result) => {
        if (active && result.ok) {
          setReminders({ list: result.value, loadedAt: now() })
        }
      })
    }
    loadTasks()
    loadReminders()
    // Each opening shows the tab asked for, with fresh lists.
    const stopOpened = window.faiPanel.onOpened((opened) => {
      setTab(opened)
      loadTasks()
      loadReminders()
    })
    // The scheduler announced something while the panel is open.
    const stopChanged = window.faiPanel.onRemindersChanged(loadReminders)
    return () => {
      active = false
      stopOpened()
      stopChanged()
    }
  }, [now])

  /** Arrow keys, Home and End move between tabs, as in the WAI-ARIA tabs pattern. */
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const index = TABS.findIndex(([id]) => id === tab)
    const next = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    }[event.key]
    const target = next === undefined ? undefined : TABS[next]?.[0]
    if (target === undefined) {
      return
    }
    event.preventDefault()
    setTab(target)
    tabRefs.current.get(target)?.focus()
  }

  const chip =
    tab === 'tasks'
      ? plural(panelView(tasks).pending.length, 'pendente', 'pendentes')
      : plural(reminderView(reminders.list).pending.length, 'lembrete', 'lembretes')

  return (
    <main className="panel">
      <header className="panel__header">
        <h1 className="panel__title">✿ Fai</h1>
        <span className="panel__chip">{chip}</span>
      </header>

      <div className="tabs" role="tablist" aria-label="Seções do painel">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            ref={(element) => {
              if (element === null) {
                tabRefs.current.delete(id)
              } else {
                tabRefs.current.set(id, element)
              }
            }}
            id={`tab-${id}`}
            className="tabs__tab"
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`tabpanel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => {
              setTab(id)
            }}
            onKeyDown={onTabKeyDown}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Both stay mounted, so a half-typed text survives a trip to the other tab. */}
      <section
        id="tabpanel-tasks"
        className="panel__tab"
        role="tabpanel"
        aria-labelledby="tab-tasks"
        hidden={tab !== 'tasks'}
      >
        <TasksTab tasks={tasks} active={tab === 'tasks'} reload={reloadTasks} />
      </section>
      <section
        id="tabpanel-reminders"
        className="panel__tab"
        role="tabpanel"
        aria-labelledby="tab-reminders"
        hidden={tab !== 'reminders'}
      >
        <RemindersTab
          reminders={reminders.list}
          loadedAt={reminders.loadedAt}
          active={tab === 'reminders'}
          now={now}
          reload={reloadReminders}
        />
      </section>

      <p className="panel__footer" aria-hidden="true">
        ✦ você consegue ✦
      </p>
    </main>
  )
}
