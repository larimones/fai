import { type ShortTextResult, validateText } from '../text'

/** One message in the chat bubble: from the person or from Fai (ADR-0017). */
export interface ChatMessage {
  readonly role: 'user' | 'fai'
  readonly text: string
}

/** The open conversation; it lives only while the bubble is open (RF-18 CA3). */
export interface Conversation {
  readonly messages: readonly ChatMessage[]
  /** A reply is on the way: no new message until it arrives or fails. */
  readonly waiting: boolean
}

/** Longest message the person can send, in characters (code points). */
export const CHAT_TEXT_MAX_LENGTH = 1000

/** Messages from the person per conversation, to keep the cost down (owner decision, 2026-11-18). */
export const CHAT_MESSAGE_LIMIT = 30

export const EMPTY_CONVERSATION: Conversation = { messages: [], waiting: false }

export type ChatTextResult = ShortTextResult

export type UserMessageAddition =
  | { readonly ok: true; readonly conversation: Conversation; readonly text: string }
  | {
      readonly ok: false
      readonly code: 'INVALID_TEXT'
      readonly reason: Extract<ChatTextResult, { ok: false }>['reason']
    }
  | { readonly ok: false; readonly code: 'BUSY' | 'LIMIT' }

export function validateChatText(raw: string): ChatTextResult {
  return validateText(raw, CHAT_TEXT_MAX_LENGTH)
}

export function userMessageCount(conversation: Conversation): number {
  return conversation.messages.filter((message) => message.role === 'user').length
}

export function reachedLimit(conversation: Conversation): boolean {
  return userMessageCount(conversation) >= CHAT_MESSAGE_LIMIT
}

/** Adds the person's message and starts waiting for Fai's reply (CA3). */
export function addUserMessage(conversation: Conversation, raw: string): UserMessageAddition {
  if (conversation.waiting) {
    return { ok: false, code: 'BUSY' }
  }
  if (reachedLimit(conversation)) {
    return { ok: false, code: 'LIMIT' }
  }
  const text = validateChatText(raw)
  if (!text.ok) {
    return { ok: false, code: 'INVALID_TEXT', reason: text.reason }
  }
  return {
    ok: true,
    text: text.text,
    conversation: {
      messages: [...conversation.messages, { role: 'user', text: text.text }],
      waiting: true,
    },
  }
}

export function appendReply(conversation: Conversation, text: string): Conversation {
  return { messages: [...conversation.messages, { role: 'fai', text }], waiting: false }
}

/** Takes out the message whose reply failed and gives its text back, to be sent again (CA6). */
export function dropFailedMessage(conversation: Conversation): {
  readonly conversation: Conversation
  readonly text: string
} {
  const last = conversation.messages.at(-1)
  if (!conversation.waiting || last?.role !== 'user') {
    return { conversation, text: '' }
  }
  return {
    conversation: { messages: conversation.messages.slice(0, -1), waiting: false },
    text: last.text,
  }
}
