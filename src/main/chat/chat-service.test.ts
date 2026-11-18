import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_MESSAGE_LIMIT, type ChatMessage } from '@domain/chat/conversation'
import { IpcRuleError } from '../ipc/invoke-handler'
import type { SecretStorage } from '../os/desktop-integration'
import { createApiKeyStore } from './api-key-store'
import { type ChatFailure, ChatFailureError, type ChatModel } from './claude-chat'
import { CHAT_MESSAGES, createChatService } from './chat-service'

const KEY = 'sk-ant-api03-segredo-da-fai'
const MARKER = 'borboleta-violeta-42'

const encrypting: SecretStorage = {
  persists: true,
  encrypt: (text) => Buffer.from(Buffer.from(text).toString('base64'), 'utf8'),
  decrypt: (data) => Buffer.from(data.toString('utf8'), 'base64').toString('utf8'),
}

interface Turn {
  readonly deltas?: readonly string[]
  readonly failure?: ChatFailure
  /** Resolves the reply only when the test says so. */
  readonly hold?: boolean
  /** Keeps sending text after the abort, like pieces already on their way. */
  readonly ignoreAbort?: boolean
}

/** A stand-in for Claude: plays one scripted turn per request and records what it was sent. */
function fakeModel() {
  const turns: Turn[] = []
  const requests: (readonly ChatMessage[])[] = []
  const signals: AbortSignal[] = []
  const released: (() => void)[] = []
  const checkKey = vi.fn(() => Promise.resolve())
  const model: ChatModel = {
    async stream(messages, { onText, signal }) {
      requests.push([...messages])
      signals.push(signal)
      const turn = turns.shift() ?? {}
      if (turn.hold === true) {
        await new Promise<void>((resolve) => {
          released.push(resolve)
        })
      }
      if (signal.aborted && turn.ignoreAbort !== true) {
        throw new ChatFailureError('aborted')
      }
      const deltas = turn.deltas ?? ['Oi! ', '✨']
      for (const delta of deltas) {
        onText(delta)
      }
      if (turn.failure !== undefined) {
        throw new ChatFailureError(turn.failure)
      }
      return deltas.join('')
    },
    checkKey,
  }
  return {
    model,
    turns,
    requests,
    signals,
    checkKey,
    release: () => released.shift()?.(),
  }
}

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fai-chat-'))
})

afterEach(async () => {
  vi.restoreAllMocks()
  await rm(dir, { recursive: true, force: true })
})

async function setup(options: { key?: string | null; storage?: SecretStorage } = {}) {
  const keys = createApiKeyStore({
    filePath: join(dir, 'fai-ai-key.bin'),
    storage: options.storage ?? encrypting,
  })
  if (options.key !== null) {
    await keys.save(options.key ?? KEY)
  }
  const fake = fakeModel()
  const makeModel = vi.fn(() => fake.model)
  const bubble = { delta: vi.fn(), end: vi.fn(), error: vi.fn() }
  const react = vi.fn()
  const service = createChatService({ keys, makeModel, bubble, react })
  return { service, keys, fake, makeModel, bubble, react }
}

async function ruleError(run: () => Promise<unknown>): Promise<IpcRuleError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof IpcRuleError) {
      return error
    }
    throw error
  }
  throw new Error('expected a rule error')
}

describe('chat service (RF-18, CA3, CA5, CA6, ADR-0017)', () => {
  it('tells the bubble whether there is a key and whether it is kept', async () => {
    expect((await setup()).service.status()).toEqual({ hasKey: true, keyPersists: true })
    expect((await setup({ key: null })).service.status()).toEqual({
      hasKey: false,
      keyPersists: true,
    })
    expect((await setup({ storage: { persists: false } })).service.status()).toEqual({
      hasKey: true,
      keyPersists: false,
    })
  })

  it('streams the reply to the bubble, then ends it and makes Fai blink once', async () => {
    const { service, fake, makeModel, bubble, react } = await setup()
    fake.turns.push({ deltas: ['Que ', 'alegria!'] })

    await service.send('  oi, Fai  ')

    expect(makeModel).toHaveBeenCalledExactlyOnceWith(KEY)
    expect(fake.requests).toEqual([[{ role: 'user', text: 'oi, Fai' }]])
    expect(bubble.delta.mock.calls).toEqual([['Que '], ['alegria!']])
    expect(bubble.end).toHaveBeenCalledOnce()
    expect(bubble.error).not.toHaveBeenCalled()
    expect(react).toHaveBeenCalledOnce()
  })

  it('sends the whole open conversation each time', async () => {
    const { service, fake } = await setup()
    fake.turns.push({ deltas: ['Oi!'] }, { deltas: ['Tudo ótimo.'] })

    await service.send('oi')
    await service.send('tudo bem?')

    expect(fake.requests[1]).toEqual([
      { role: 'user', text: 'oi' },
      { role: 'fai', text: 'Oi!' },
      { role: 'user', text: 'tudo bem?' },
    ])
  })

  it('refuses an empty message, a message without a key and one while Fai is answering (CA3)', async () => {
    const empty = await setup()
    expect(await ruleError(() => empty.service.send('   '))).toMatchObject({
      code: 'INVALID_TEXT',
      message: CHAT_MESSAGES.empty,
    })
    expect(await ruleError(() => empty.service.send('a'.repeat(1001)))).toMatchObject({
      code: 'INVALID_TEXT',
      message: CHAT_MESSAGES.tooLong,
    })
    expect(empty.fake.requests).toEqual([])

    const noKey = await setup({ key: null })
    expect(await ruleError(() => noKey.service.send('oi'))).toMatchObject({ code: 'NO_KEY' })

    const busy = await setup()
    busy.fake.turns.push({ hold: true })
    const first = busy.service.send('oi')
    expect(await ruleError(() => busy.service.send('de novo'))).toMatchObject({
      code: 'BUSY',
      message: CHAT_MESSAGES.busy,
    })
    busy.fake.release()
    await first
  })

  it('closing aborts the reply on the way and forgets the conversation (CA5)', async () => {
    const { service, fake, bubble, react } = await setup()
    fake.turns.push({ deltas: ['Oi!'] }, { hold: true }, { deltas: ['Olá de novo!'] })
    await service.send('oi')
    const pending = service.send('lembra de mim?')

    service.close()
    fake.release()
    await pending

    expect(fake.signals[1]?.aborted).toBe(true)
    // Nothing from the closed conversation reaches the bubble after it closed.
    expect(bubble.end).toHaveBeenCalledOnce()
    expect(bubble.error).not.toHaveBeenCalled()
    expect(react).toHaveBeenCalledOnce()

    await service.send('oi de novo')
    expect(fake.requests[2]).toEqual([{ role: 'user', text: 'oi de novo' }])
  })

  it('drops text that still arrives from a conversation already closed (CA5)', async () => {
    const { service, fake, bubble, react } = await setup()
    fake.turns.push({ hold: true, ignoreAbort: true, deltas: ['resto da conversa antiga'] })
    const pending = service.send('oi')

    service.close()
    fake.release()
    await pending

    expect(bubble.delta).not.toHaveBeenCalled()
    expect(bubble.end).not.toHaveBeenCalled()
    expect(react).not.toHaveBeenCalled()
  })

  it('writes nothing of the conversation to disk (CA5)', async () => {
    const { service, fake } = await setup()
    fake.turns.push({ deltas: [`Adorei: ${MARKER}`] })

    await service.send(`minha palavra é ${MARKER}`)
    service.close()

    const files = await readdir(dir)
    expect(files).toEqual(['fai-ai-key.bin'])
    for (const file of files) {
      expect((await readFile(join(dir, file))).toString('latin1')).not.toContain(MARKER)
    }
  })

  it.each([
    ['offline', CHAT_MESSAGES.offline],
    ['timeout', CHAT_MESSAGES.timeout],
    ['invalid-key', CHAT_MESSAGES.invalidKey],
    ['billing', CHAT_MESSAGES.billing],
    ['rate-limit', CHAT_MESSAGES.rateLimit],
    ['unavailable', CHAT_MESSAGES.unavailable],
    ['refusal', CHAT_MESSAGES.refusal],
    ['unknown', CHAT_MESSAGES.unknown],
  ] as const)(
    'on %s, shows a gentle message and gives the text back to send again (CA6)',
    async (failure, message) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { service, fake, bubble, react } = await setup()
      fake.turns.push({ failure }, { deltas: ['Agora foi!'] })

      await service.send('oi')

      expect(bubble.error).toHaveBeenCalledExactlyOnceWith({ message, text: 'oi' })
      expect(bubble.end).not.toHaveBeenCalled()
      expect(react).not.toHaveBeenCalled()

      await service.send('oi')
      expect(fake.requests[1]).toEqual([{ role: 'user', text: 'oi' }])
      expect(bubble.end).toHaveBeenCalledOnce()
    },
  )

  it('never writes the key to the log', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { service, fake } = await setup()
    fake.turns.push({ failure: 'unknown' })

    await service.send('oi')

    const logged = JSON.stringify([...error.mock.calls, ...warn.mock.calls])
    expect(logged).not.toContain(KEY)
  })

  it('answers the 30th message, then tells Fai needs rest and refuses more (owner decision)', async () => {
    const { service, bubble } = await setup()
    for (let index = 1; index < CHAT_MESSAGE_LIMIT; index++) {
      await service.send(`mensagem ${String(index)}`)
    }
    expect(bubble.error).not.toHaveBeenCalled()

    await service.send('a trigésima')

    expect(bubble.end).toHaveBeenCalledTimes(CHAT_MESSAGE_LIMIT)
    expect(bubble.error).toHaveBeenCalledExactlyOnceWith({ message: CHAT_MESSAGES.limit, text: '' })
    expect(await ruleError(() => service.send('mais uma'))).toMatchObject({
      code: 'LIMIT',
      message: CHAT_MESSAGES.limit,
    })

    service.close()
    await expect(service.send('conversa nova')).resolves.toBeUndefined()
  })
})

describe('chat service keys (RF-19, CA7, CA8)', () => {
  it('checks a new key with the service before keeping it', async () => {
    const { service, keys, fake, makeModel } = await setup({ key: null })

    await service.saveKey('sk-ant-nova')

    expect(makeModel).toHaveBeenCalledExactlyOnceWith('sk-ant-nova')
    expect(fake.checkKey).toHaveBeenCalledOnce()
    expect(keys.get()).toBe('sk-ant-nova')
    expect(service.status().hasKey).toBe(true)
  })

  it('does not keep a key the service refuses, nor one it could not check', async () => {
    const refused = await setup({ key: null })
    refused.fake.checkKey.mockRejectedValueOnce(new ChatFailureError('invalid-key'))
    expect(await ruleError(() => refused.service.saveKey('sk-errada'))).toMatchObject({
      code: 'INVALID_KEY',
      message: CHAT_MESSAGES.keyRefused,
    })
    expect(refused.keys.get()).toBeNull()

    const offline = await setup({ key: null })
    offline.fake.checkKey.mockRejectedValueOnce(new ChatFailureError('offline'))
    expect(await ruleError(() => offline.service.saveKey('sk-boa'))).toMatchObject({
      code: 'KEY_NOT_SAVED',
      message: CHAT_MESSAGES.offline,
    })
    expect(offline.keys.get()).toBeNull()
  })

  it('clears the key, so the bubble asks for one again', async () => {
    const { service } = await setup()

    await service.clearKey()

    expect(service.status().hasKey).toBe(false)
    expect(await readdir(dir)).toEqual([])
  })
})
