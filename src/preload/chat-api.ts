import type { IpcRenderer } from 'electron'
import type { ChatApi, ChatSaveKeyRequest, ChatSendRequest, IpcResult } from '@shared/ipc/api'
import { IpcChannels } from '@shared/ipc/channels'
import { eventContract } from '@shared/ipc/schemas'

/** The part of a payload schema the preload needs. */
interface PayloadSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false }
}

/**
 * Builds `window.faiChat` for the chat bubble (ADR-0017). Named functions only: never expose
 * ipcRenderer, and nothing that reads the API key back.
 */
export function createChatApi(ipc: Pick<IpcRenderer, 'invoke' | 'on' | 'removeListener'>): ChatApi {
  /** Listens to a main → bubble event; the Electron event and unexpected payloads never pass. */
  function listen<T>(
    channel: string,
    schema: PayloadSchema<T>,
    deliver: (data: T) => void,
  ): () => void {
    const handler = (_event: unknown, payload?: unknown): void => {
      const parsed = schema.safeParse(payload)
      if (parsed.success) {
        deliver(parsed.data)
      }
    }
    ipc.on(channel, handler)
    return () => {
      ipc.removeListener(channel, handler)
    }
  }

  return {
    send: (text) =>
      ipc.invoke(IpcChannels.chatSend, { text } satisfies ChatSendRequest) as Promise<
        IpcResult<null>
      >,
    saveKey: (key) =>
      ipc.invoke(IpcChannels.chatSaveKey, { key } satisfies ChatSaveKeyRequest) as Promise<
        IpcResult<null>
      >,
    onOpened: (listener) =>
      listen(IpcChannels.chatOpened, eventContract[IpcChannels.chatOpened], listener),
    onPlaced: (listener) =>
      listen(IpcChannels.chatPlaced, eventContract[IpcChannels.chatPlaced], listener),
    onReplyDelta: (listener) =>
      listen(IpcChannels.chatReplyDelta, eventContract[IpcChannels.chatReplyDelta], ({ text }) => {
        listener(text)
      }),
    onReplyEnd: (listener) =>
      listen(IpcChannels.chatReplyEnd, eventContract[IpcChannels.chatReplyEnd], () => {
        listener()
      }),
    onReplyError: (listener) =>
      listen(IpcChannels.chatReplyError, eventContract[IpcChannels.chatReplyError], listener),
  }
}
