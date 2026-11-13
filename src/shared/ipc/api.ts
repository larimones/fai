import type { AppInfo } from '@domain/app-info'
import type { Task } from '@domain/tasks/tasks'

export type IpcErrorCode =
  | 'INVALID_PAYLOAD'
  | 'UNTRUSTED_SENDER'
  | 'INTERNAL'
  /** The task title broke the rule (RF-11 CA1); the message says how. */
  | 'INVALID_TITLE'
  /** The task or reminder no longer exists (RF-13 CA2). */
  | 'NOT_FOUND'
  /** The reminder text broke the rule (RF-14 CA1). */
  | 'INVALID_TEXT'
  /** The reminder time is not in the future (RF-14 CA1). */
  | 'DUE_NOT_IN_FUTURE'

export interface IpcError {
  readonly code: IpcErrorCode
  readonly message: string
}

/** Every invoke resolves to a result; errors never carry stack traces to the renderer. */
export type IpcResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: IpcError }

/** Tells the main process whether the pointer is over the drawing (RF-05). */
export interface SetInteractiveMessage {
  readonly interactive: boolean
}

export type DragPhase = 'start' | 'move' | 'end'

/** A step of a drag; the main process reads the cursor itself (ADR-0004). */
export interface DragMessage {
  readonly phase: DragPhase
}

/** What makes Fai react, sent by the main process (RF-12 CA2). */
export interface MascotReaction {
  readonly kind: 'celebrate' | 'reminder'
}

/** The panel tabs (ADR-0016). */
export type PanelTab = 'tasks' | 'reminders'

/** Sent when the panel opens: which tab to show. */
export interface PanelOpened {
  readonly tab: PanelTab
}

export interface CreateReminderRequest {
  readonly text: string
  /** ISO 8601 instant. */
  readonly dueAt: string
}

export interface DeleteReminderRequest {
  readonly id: string
}

export interface CreateTaskRequest {
  readonly title: string
}

export interface SetTaskDoneRequest {
  readonly id: string
  readonly done: boolean
}

export interface DeleteTaskRequest {
  readonly id: string
}

/** The whole surface exposed to the mascot window as `window.fai`. */
export interface FaiApi {
  readonly app: {
    getInfo(): Promise<IpcResult<AppInfo>>
  }
  readonly mascot: {
    setInteractive(interactive: boolean): void
    drag(phase: DragPhase): void
    /** Asks the main process for the context menu (RF-10 CA1). */
    openMenu(): void
    /** Calls `listener` for each reaction the main process asks for; returns a function that stops listening. */
    onReaction(listener: (reaction: MascotReaction) => void): () => void
  }
}

/** The whole surface exposed to the panel window as `window.faiPanel` (ADR-0014). */
export interface PanelApi {
  readonly tasks: {
    list(): Promise<IpcResult<readonly Task[]>>
    create(title: string): Promise<IpcResult<Task>>
    setDone(id: string, done: boolean): Promise<IpcResult<Task>>
    delete(id: string): Promise<IpcResult<null>>
  }
  /** Calls `listener` each time the panel is opened; returns a function that stops listening. */
  onOpened(listener: (tab: PanelTab) => void): () => void
}
