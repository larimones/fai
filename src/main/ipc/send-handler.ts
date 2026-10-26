import type { IpcMainEvent } from 'electron'
import type { z } from 'zod'
import type { SenderGuard } from './invoke-handler'

/**
 * Wraps a listener for a `send` channel. There is no reply to carry an error, so
 * untrusted senders, invalid payloads and failures are logged and dropped.
 */
export function createSendHandler<Message>(
  schema: z.ZodType<Message>,
  isTrustedSender: SenderGuard,
  run: (message: Message) => void,
): (event: IpcMainEvent, payload?: unknown) => void {
  return (event, payload) => {
    if (!isTrustedSender(event)) {
      console.warn('[ipc] message from an untrusted sender ignored')
      return
    }
    const message = schema.safeParse(payload)
    if (!message.success) {
      console.warn('[ipc] invalid message ignored')
      return
    }
    try {
      run(message.data)
    } catch (error) {
      console.error('[ipc] listener failed', error)
    }
  }
}
