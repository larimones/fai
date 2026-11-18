import { describe, expect, it } from 'vitest'
import {
  addUserMessage,
  appendReply,
  CHAT_MESSAGE_LIMIT,
  CHAT_TEXT_MAX_LENGTH,
  type Conversation,
  dropFailedMessage,
  EMPTY_CONVERSATION,
  reachedLimit,
  userMessageCount,
  validateChatText,
} from './conversation'

const frozen = (conversation: Conversation): Conversation =>
  Object.freeze({ ...conversation, messages: Object.freeze([...conversation.messages]) })

/** A conversation with `count` answered messages from the person. */
function talked(count: number): Conversation {
  let conversation = EMPTY_CONVERSATION
  for (let index = 0; index < count; index++) {
    const added = addUserMessage(conversation, `oi ${String(index)}`)
    if (!added.ok) {
      throw new Error(added.code)
    }
    conversation = appendReply(added.conversation, `olá ${String(index)}`)
  }
  return conversation
}

describe('validateChatText (CA3)', () => {
  it('trims and accepts 1 to 1000 characters, counting an emoji as one', () => {
    expect(CHAT_TEXT_MAX_LENGTH).toBe(1000)
    expect(validateChatText('  oi, Fai \n')).toEqual({ ok: true, text: 'oi, Fai' })
    expect(validateChatText('a'.repeat(1000))).toMatchObject({ ok: true })
    expect(validateChatText('🧚'.repeat(1000))).toMatchObject({ ok: true })
  })

  it('rejects empty, blank and too long texts', () => {
    expect(validateChatText('')).toEqual({ ok: false, reason: 'EMPTY' })
    expect(validateChatText(' \t\n ')).toEqual({ ok: false, reason: 'EMPTY' })
    expect(validateChatText('a'.repeat(1001))).toEqual({ ok: false, reason: 'TOO_LONG' })
  })
})

describe('conversation (CA3, CA5, ADR-0017)', () => {
  it('starts empty and not waiting', () => {
    expect(EMPTY_CONVERSATION).toEqual({ messages: [], waiting: false })
  })

  it('adds the trimmed message and waits for the reply, without changing the input', () => {
    const before = frozen(EMPTY_CONVERSATION)

    const added = addUserMessage(before, '  oi  ')

    expect(added).toEqual({
      ok: true,
      text: 'oi',
      conversation: { messages: [{ role: 'user', text: 'oi' }], waiting: true },
    })
    expect(before).toEqual(EMPTY_CONVERSATION)
  })

  it('refuses an invalid text', () => {
    expect(addUserMessage(EMPTY_CONVERSATION, '   ')).toEqual({
      ok: false,
      code: 'INVALID_TEXT',
      reason: 'EMPTY',
    })
  })

  it('refuses a new message while a reply is on the way', () => {
    const added = addUserMessage(EMPTY_CONVERSATION, 'oi')
    if (!added.ok) {
      throw new Error('expected ok')
    }

    expect(addUserMessage(added.conversation, 'tudo bem?')).toEqual({ ok: false, code: 'BUSY' })
  })

  it('appends the reply and stops waiting', () => {
    const added = addUserMessage(EMPTY_CONVERSATION, 'oi')
    if (!added.ok) {
      throw new Error('expected ok')
    }

    expect(appendReply(frozen(added.conversation), 'Olá! ✨')).toEqual({
      messages: [
        { role: 'user', text: 'oi' },
        { role: 'fai', text: 'Olá! ✨' },
      ],
      waiting: false,
    })
  })

  it('accepts the 30th message and refuses the 31st (owner decision, 2026-11-18)', () => {
    expect(CHAT_MESSAGE_LIMIT).toBe(30)
    const almost = talked(29)
    expect(reachedLimit(almost)).toBe(false)

    const thirtieth = addUserMessage(almost, 'a última')
    expect(thirtieth).toMatchObject({ ok: true })
    if (!thirtieth.ok) {
      throw new Error('expected ok')
    }
    const full = appendReply(thirtieth.conversation, 'tchau')

    expect(userMessageCount(full)).toBe(30)
    expect(reachedLimit(full)).toBe(true)
    expect(addUserMessage(full, 'mais uma')).toEqual({ ok: false, code: 'LIMIT' })
  })

  it('takes a failed message out and gives its text back, so it can be sent again (CA6)', () => {
    const start = talked(1)
    const added = addUserMessage(start, 'e agora?')
    if (!added.ok) {
      throw new Error('expected ok')
    }

    expect(dropFailedMessage(frozen(added.conversation))).toEqual({
      conversation: start,
      text: 'e agora?',
    })
  })

  it('has nothing to drop when no reply is on the way', () => {
    const start = talked(1)

    expect(dropFailedMessage(start)).toEqual({ conversation: start, text: '' })
  })
})
