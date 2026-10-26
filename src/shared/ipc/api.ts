import type { AppInfo } from '@domain/app-info'

export type IpcErrorCode = 'INVALID_PAYLOAD' | 'UNTRUSTED_SENDER' | 'INTERNAL'

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

/** The whole surface exposed to the main window as `window.fai`. */
export interface FaiApi {
  readonly app: {
    getInfo(): Promise<IpcResult<AppInfo>>
  }
}
