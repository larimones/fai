import { useEffect, useState } from 'react'
import { panelView, type Task } from '@domain/tasks/tasks'

/** First version of the panel (T5.08): shows the pending tasks each time it opens. The full UI is T5.10. */
export function PanelApp() {
  const [tasks, setTasks] = useState<readonly Task[]>([])

  useEffect(() => {
    const load = (): void => {
      window.faiPanel.tasks.list().then(
        (result) => {
          if (result.ok) {
            setTasks(result.value)
          }
        },
        () => undefined,
      )
    }
    load()
    return window.faiPanel.onOpened(load)
  }, [])

  const { pending } = panelView(tasks)
  return (
    <main className="panel">
      <h1 className="panel__title">✿ Tarefas da Fai</h1>
      <ul className="panel__list">
        {pending.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </main>
  )
}
