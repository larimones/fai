import {
  addUserMessage,
  appendReply,
  CHAT_TEXT_MAX_LENGTH,
  type Conversation,
  dropFailedMessage,
  EMPTY_CONVERSATION,
  reachedLimit,
} from '@domain/chat/conversation'
import type { ChatReplyError } from '@shared/ipc/api'
import { IpcRuleError } from '../ipc/invoke-handler'
import type { ApiKeyStore } from './api-key-store'
import { type ChatFailure, ChatFailureError, type ChatModel } from './claude-chat'

/** Everything Fai says in the bubble when something is off, in pt-BR (plan of feature 07). */
export const CHAT_MESSAGES = {
  empty: 'Escreve alguma coisinha para eu responder? ✨',
  tooLong: `Essa mensagem ficou grandinha. Pode resumir em até ${String(CHAT_TEXT_MAX_LENGTH)} caracteres?`,
  busy: 'Calma, ainda estou respondendo a anterior!',
  noKey: 'Antes de conversar, preciso da chave do serviço de IA.',
  limit:
    'Conversamos tanto! Preciso descansar as asinhas. Fecha e abre o balão para começarmos de novo.',
  offline: 'Não consegui falar com as estrelas agora. Confere a internet e tenta de novo?',
  timeout: 'Me perdi nos pensamentos e demorei demais. Tenta de novo?',
  invalidKey: 'Minha chave não funcionou. Troque em "Trocar chave da IA…" na bandeja.',
  billing: 'Os créditos do serviço de IA acabaram. Dá uma olhadinha na sua conta?',
  rateLimit: 'Preciso de um respiro. Tenta daqui a pouquinho?',
  unavailable: 'As estrelas estão cansadinhas agora. Tenta de novo daqui a pouco?',
  refusal: 'Sobre isso eu não sei conversar. Que tal outro assunto?',
  unknown: 'Algo deu errado por aqui. Tenta de novo?',
  keyRefused: 'Essa chave não funcionou. Confere se copiou ela inteira?',
  keyNotKept: 'Não consegui guardar a chave. Tenta de novo?',
} as const

const FAILURE_MESSAGES: Readonly<Record<ChatFailure, string>> = {
  offline: CHAT_MESSAGES.offline,
  timeout: CHAT_MESSAGES.timeout,
  'invalid-key': CHAT_MESSAGES.invalidKey,
  billing: CHAT_MESSAGES.billing,
  'rate-limit': CHAT_MESSAGES.rateLimit,
  unavailable: CHAT_MESSAGES.unavailable,
  refusal: CHAT_MESSAGES.refusal,
  // Only happens when the bubble closed, and then nothing is shown.
  aborted: CHAT_MESSAGES.unknown,
  unknown: CHAT_MESSAGES.unknown,
}

/** Where the reply goes: the chat bubble window. */
export interface ChatBubble {
  delta(text: string): void
  end(): void
  error(failure: ChatReplyError): void
}

export interface ChatServiceOptions {
  readonly keys: ApiKeyStore
  readonly makeModel: (apiKey: string) => ChatModel
  readonly bubble: ChatBubble
  /** Makes Fai blink when a reply arrives (owner decision, 2026-11-18). */
  readonly react: () => void
}

export interface ChatService {
  status(): { readonly hasKey: boolean; readonly keyPersists: boolean }
  /** Sends the person's message; resolves when Fai's reply (or its failure) reached the bubble. */
  send(text: string): Promise<void>
  /** The bubble closed: abort the reply on the way and forget the conversation (RF-18 CA3). */
  close(): void
  saveKey(key: string): Promise<void>
  clearKey(): Promise<void>
}

function failureOf(error: unknown): ChatFailure {
  return error instanceof ChatFailureError ? error.failure : 'unknown'
}

/** The open conversation, kept only in memory while the bubble is open (ADR-0017). */
export function createChatService(options: ChatServiceOptions): ChatService {
  const { keys, makeModel, bubble, react } = options
  let conversation: Conversation = EMPTY_CONVERSATION
  // Bumped on every close: replies from an earlier conversation are dropped.
  let generation = 0
  let controller: AbortController | null = null

  return {
    status: () => ({ hasKey: keys.get() !== null, keyPersists: keys.persists }),

    async send(raw) {
      const key = keys.get()
      if (key === null) {
        throw new IpcRuleError('NO_KEY', CHAT_MESSAGES.noKey)
      }
      const added = addUserMessage(conversation, raw)
      if (!added.ok) {
        if (added.code === 'INVALID_TEXT') {
          throw new IpcRuleError(
            'INVALID_TEXT',
            added.reason === 'EMPTY' ? CHAT_MESSAGES.empty : CHAT_MESSAGES.tooLong,
          )
        }
        throw new IpcRuleError(
          added.code,
          added.code === 'BUSY' ? CHAT_MESSAGES.busy : CHAT_MESSAGES.limit,
        )
      }
      conversation = added.conversation
      const mine = generation
      const current = new AbortController()
      controller = current
      let reply: string
      try {
        reply = await makeModel(key).stream(conversation.messages, {
          onText: (text) => {
            if (generation === mine) {
              bubble.delta(text)
            }
          },
          signal: current.signal,
        })
      } catch (error) {
        if (generation !== mine) {
          return
        }
        controller = null
        const failure = failureOf(error)
        // Only the kind of failure: the original error may carry request details.
        console.error(`Fai: a resposta da conversa falhou (${failure}).`)
        const dropped = dropFailedMessage(conversation)
        conversation = dropped.conversation
        bubble.error({ message: FAILURE_MESSAGES[failure], text: dropped.text })
        return
      }
      if (generation !== mine) {
        return
      }
      controller = null
      conversation = appendReply(conversation, reply)
      bubble.end()
      react()
      if (reachedLimit(conversation)) {
        bubble.error({ message: CHAT_MESSAGES.limit, text: '' })
      }
    },

    close() {
      generation += 1
      controller?.abort()
      controller = null
      conversation = EMPTY_CONVERSATION
    },

    async saveKey(key) {
      try {
        await makeModel(key).checkKey()
      } catch (error) {
        const failure = failureOf(error)
        if (failure === 'invalid-key') {
          throw new IpcRuleError('INVALID_KEY', CHAT_MESSAGES.keyRefused)
        }
        throw new IpcRuleError('KEY_NOT_SAVED', FAILURE_MESSAGES[failure])
      }
      try {
        await keys.save(key)
      } catch {
        throw new IpcRuleError('KEY_NOT_SAVED', CHAT_MESSAGES.keyNotKept)
      }
    },

    clearKey: () => keys.clear(),
  }
}
