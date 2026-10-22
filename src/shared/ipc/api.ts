import type { AppInfo } from '@domain/app-info'

export type IpcErrorCode = 'INVALID_PAYLOAD' | 'UNTRUSTED_SENDER' | 'INTERNAL'

export interface IpcError {
  readonly code: IpcErrorCode
  readonly message: string
}

/** Every invoke resolves to a result; errors never carry stack traces to the renderer. */
export type IpcResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: IpcError }

/** The whole surface exposed to the main window as `window.fai`. */
export interface FaiApi {
  readonly app: {
    getInfo(): Promise<IpcResult<AppInfo>>
  }
}
