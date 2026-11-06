import type { AppInfo } from '@domain/app-info'

export type IpcErrorCode =
  | 'INVALID_PAYLOAD'
  | 'UNTRUSTED_SENDER'
  | 'INTERNAL'
  /** The task title broke the rule (RF-11 CA1); the message says how. */
  | 'INVALID_TITLE'
  /** The task no longer exists (RF-13 CA2). */
  | 'NOT_FOUND'

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
  readonly kind: 'celebrate'
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
  }
}
