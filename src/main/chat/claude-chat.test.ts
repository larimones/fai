import Anthropic from '@anthropic-ai/sdk'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '@domain/chat/conversation'
import {
  CHAT_MODEL,
  ChatFailureError,
  type ClaudeClientPort,
  claudeClientOptions,
  createClaudeChat,
  OFFICIAL_BASE_URL,
} from './claude-chat'
import { FAI_PERSONALITY } from './personality'

const KEY = 'sk-ant-api03-test-key'
const CONVERSATION: readonly ChatMessage[] = [
  { role: 'user', text: 'oi, Fai' },
  { role: 'fai', text: 'Oi! ✨' },
  { role: 'user', text: 'como você está?' },
]

interface Script {
  readonly deltas?: readonly string[]
  readonly stopReason?: string
  readonly error?: Error
}

/** A stand-in for the SDK client: plays a scripted stream and records each request. */
function fakeClient(script: Script = {}) {
  const requests: { body: unknown; options: unknown }[] = []
  const stream = vi.fn((body: unknown, options: unknown) => {
    requests.push({ body, options })
    let onText: ((delta: string) => void) | undefined
    const handle = {
      on(event: string, listener: (delta: string) => void) {
        if (event === 'text') {
          onText = listener
        }
        return handle
      },
      abort: vi.fn(),
      finalMessage: () => {
        const deltas = script.deltas ?? ['Estou ', 'ótima!']
        for (const delta of deltas) {
          onText?.(delta)
        }
        if (script.error !== undefined) {
          return Promise.reject(script.error)
        }
        return Promise.resolve({
          stop_reason: script.stopReason ?? 'end_turn',
          content: [
            { type: 'thinking', thinking: '' },
            { type: 'text', text: deltas.join('') },
          ],
        })
      },
    }
    return handle
  })
  const retrieve = vi.fn(() =>
    script.error === undefined ? Promise.resolve({ id: CHAT_MODEL }) : Promise.reject(script.error),
  )
  const client = { beta: { messages: { stream } }, models: { retrieve } }
  return { client: client as unknown as ClaudeClientPort, stream, retrieve, requests }
}

const headers = new Headers()
const apiError = (status: number) =>
  Anthropic.APIError.generate(status, { error: { type: 'x' } }, 'falhou', headers)

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Claude client options (RF-19 CA2, ADR-0017)', () => {
  it('passes the key, pins the official address and turns off the SDK logs', () => {
    expect(claudeClientOptions(KEY)).toEqual({
      apiKey: KEY,
      authToken: null,
      baseURL: OFFICIAL_BASE_URL,
      timeout: 60_000,
      maxRetries: 1,
      logLevel: 'off',
    })
    expect(OFFICIAL_BASE_URL).toBe('https://api.anthropic.com')
  })

  it('ignores credentials and addresses from the environment (real SDK client)', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-from-the-environment')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'token-from-the-environment')
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://elsewhere.example')

    const client = new Anthropic(claudeClientOptions(KEY))

    expect(client.apiKey).toBe(KEY)
    expect(client.authToken).toBeNull()
    expect(client.baseURL).toBe(OFFICIAL_BASE_URL)
  })

  it('builds its client with those options', () => {
    const fake = fakeClient()
    const makeClient = vi.fn(() => fake.client)

    createClaudeChat(KEY, makeClient)

    expect(makeClient).toHaveBeenCalledExactlyOnceWith(claudeClientOptions(KEY))
  })
})

describe('Claude chat (RF-18, RNF-15, ADR-0017)', () => {
  it("sends only Fai's personality and the open conversation, with the chosen settings", async () => {
    const fake = fakeClient()
    const signal = new AbortController().signal

    await createClaudeChat(KEY, () => fake.client).stream(CONVERSATION, {
      onText: () => undefined,
      signal,
    })

    expect(fake.requests).toEqual([
      {
        body: {
          model: 'claude-opus-5-5',
          max_tokens: 4096,
          system: FAI_PERSONALITY,
          messages: [
            { role: 'user', content: 'oi, Fai' },
            { role: 'assistant', content: 'Oi! ✨' },
            { role: 'user', content: 'como você está?' },
          ],
          output_config: { effort: 'low' },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        options: { signal },
      },
    ])
  })

  it('passes the reply on as it arrives and resolves with the whole text', async () => {
    const fake = fakeClient({ deltas: ['Que ', 'bom ', 'te ver!'] })
    const pieces: string[] = []

    const reply = await createClaudeChat(KEY, () => fake.client).stream(CONVERSATION, {
      onText: (text) => pieces.push(text),
      signal: new AbortController().signal,
    })

    expect(pieces).toEqual(['Que ', 'bom ', 'te ver!'])
    expect(reply).toBe('Que bom te ver!')
  })

  it('turns a refusal into a failure', async () => {
    const fake = fakeClient({ stopReason: 'refusal' })

    await expect(
      createClaudeChat(KEY, () => fake.client).stream(CONVERSATION, {
        onText: () => undefined,
        signal: new AbortController().signal,
      }),
    ).rejects.toEqual(new ChatFailureError('refusal'))
  })

  it.each([
    ['offline', new Anthropic.APIConnectionError({ message: 'sem rede' })],
    ['timeout', new Anthropic.APIConnectionTimeoutError()],
    ['aborted', new Anthropic.APIUserAbortError()],
    ['invalid-key', apiError(401)],
    ['invalid-key', apiError(403)],
    ['billing', apiError(402)],
    ['rate-limit', apiError(429)],
    ['unavailable', apiError(500)],
    ['unavailable', apiError(529)],
    ['unknown', apiError(400)],
    ['unknown', new Error('inesperado')],
  ] as const)('reports %s for %o', async (failure, error) => {
    const fake = fakeClient({ error })

    await expect(
      createClaudeChat(KEY, () => fake.client).stream(CONVERSATION, {
        onText: () => undefined,
        signal: new AbortController().signal,
      }),
    ).rejects.toEqual(new ChatFailureError(failure))
  })

  it('checks a key by looking up the model, which costs no tokens', async () => {
    const fake = fakeClient()

    await createClaudeChat(KEY, () => fake.client).checkKey()

    expect(fake.retrieve).toHaveBeenCalledExactlyOnceWith(CHAT_MODEL)
    expect(fake.stream).not.toHaveBeenCalled()
  })

  it('reports why a key check failed', async () => {
    const fake = fakeClient({ error: apiError(401) })

    await expect(createClaudeChat(KEY, () => fake.client).checkKey()).rejects.toEqual(
      new ChatFailureError('invalid-key'),
    )
  })
})

describe("Fai's personality (owner approval, 2026-11-18)", () => {
  it('keeps the approved rules', () => {
    expect(FAI_PERSONALITY).toContain('Você é a Fai')
    expect(FAI_PERSONALITY).toContain('português do Brasil')
    expect(FAI_PERSONALITY).toContain('no máximo três')
    expect(FAI_PERSONALITY).toContain('Nunca cobre nem dê bronca')
    expect(FAI_PERSONALITY).toContain('você só conversa')
    expect(FAI_PERSONALITY).toContain('Não finja ter feito algo que não fez.')
    expect(FAI_PERSONALITY).toContain('Não peça dados pessoais.')
  })
})
