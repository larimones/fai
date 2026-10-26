import type { IpcMainInvokeEvent } from 'electron'
import type { IpcErrorCode, IpcResult } from '@shared/ipc/api'
import type { InvokeDefinition } from '@shared/ipc/schemas'

/** The part of an IPC event that identifies who sent it; shared by `invoke` and `send` events. */
export type IpcSenderEvent = Pick<IpcMainInvokeEvent, 'sender' | 'senderFrame'>

export type SenderGuard = (event: IpcSenderEvent) => boolean

function failure(code: IpcErrorCode, message: string): IpcResult<never> {
  return { ok: false, error: { code, message } }
}

/**
 * Wraps a handler so it only runs for trusted senders with a valid payload,
 * and only returns values that match the declared response schema.
 */
export function createInvokeHandler<Request, Response>(
  definition: InvokeDefinition<Request, Response>,
  isTrustedSender: SenderGuard,
  run: (request: Request) => Response | Promise<Response>,
): (event: IpcMainInvokeEvent, payload?: unknown) => Promise<IpcResult<Response>> {
  return async (event, payload) => {
    if (!isTrustedSender(event)) {
      return failure('UNTRUSTED_SENDER', 'Remetente não autorizado.')
    }
    const request = definition.request.safeParse(payload)
    if (!request.success) {
      return failure('INVALID_PAYLOAD', 'Dados inválidos.')
    }
    try {
      const value = definition.response.parse(await run(request.data))
      return { ok: true, value }
    } catch (error) {
      console.error('[ipc] handler failed', error)
      return failure('INTERNAL', 'Algo deu errado.')
    }
  }
}
