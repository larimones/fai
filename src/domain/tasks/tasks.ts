import { SHORT_TEXT_MAX_LENGTH, validateShortText } from '../text'

/** A to-do item (ADR-0015). Times are ISO 8601 instants in UTC. */
export interface Task {
  readonly id: string
  readonly title: string
  readonly createdAt: string
  /** When it was completed; `null` while pending. */
  readonly completedAt: string | null
}

/** Longest title, in characters (code points: an emoji counts as one) (RF-11 CA1). */
export const TITLE_MAX_LENGTH = SHORT_TEXT_MAX_LENGTH

export type InvalidTitle = {
  readonly ok: false
  readonly code: 'INVALID_TITLE'
  readonly reason: 'EMPTY' | 'TOO_LONG'
}

export type NotFound = { readonly ok: false; readonly code: 'NOT_FOUND' }

export type TitleResult = { readonly ok: true; readonly title: string } | InvalidTitle

export type TaskChange =
  | { readonly ok: true; readonly tasks: readonly Task[]; readonly task: Task }
  | InvalidTitle
  | NotFound

export type TaskRemoval = { readonly ok: true; readonly tasks: readonly Task[] } | NotFound

export function validateTitle(raw: string): TitleResult {
  const result = validateShortText(raw)
  return result.ok
    ? { ok: true, title: result.text }
    : { ok: false, code: 'INVALID_TITLE', reason: result.reason }
}

/** Adds a pending task; the id and the time come from the caller. */
export function createTask(
  tasks: readonly Task[],
  input: { readonly id: string; readonly title: string; readonly now: string },
): TaskChange {
  const title = validateTitle(input.title)
  if (!title.ok) {
    return title
  }
  const task: Task = { id: input.id, title: title.title, createdAt: input.now, completedAt: null }
  return { ok: true, tasks: [...tasks, task], task }
}

/** Completes (records `completedAt`) or reopens (clears it) a task (RF-12 CA1). */
export function setTaskDone(
  tasks: readonly Task[],
  id: string,
  done: boolean,
  now: string,
): TaskChange {
  const current = tasks.find((candidate) => candidate.id === id)
  if (current === undefined) {
    return { ok: false, code: 'NOT_FOUND' }
  }
  // Completing twice keeps the first completion time.
  const completedAt = done ? (current.completedAt ?? now) : null
  const task: Task = { ...current, completedAt }
  return {
    ok: true,
    tasks: tasks.map((candidate) => (candidate === current ? task : candidate)),
    task,
  }
}

export function deleteTask(tasks: readonly Task[], id: string): TaskRemoval {
  if (!tasks.some((candidate) => candidate.id === id)) {
    return { ok: false, code: 'NOT_FOUND' }
  }
  return { ok: true, tasks: tasks.filter((candidate) => candidate.id !== id) }
}

export interface PanelView {
  /** Newest first, so a new task shows at the top (RF-11 CA2). */
  readonly pending: readonly Task[]
  /** Latest completion first. */
  readonly completed: readonly Task[]
}

/** The order the panel shows. Ties keep the later-stored task first. */
export function panelView(tasks: readonly Task[]): PanelView {
  const newestStoredFirst = [...tasks].reverse()
  const latest = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0)
  return {
    pending: newestStoredFirst
      .filter((task) => task.completedAt === null)
      .sort((a, b) => latest(a.createdAt, b.createdAt)),
    completed: newestStoredFirst
      .filter((task) => task.completedAt !== null)
      .sort((a, b) => latest(a.completedAt ?? '', b.completedAt ?? '')),
  }
}
