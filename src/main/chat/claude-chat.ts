import Anthropic, { type ClientOptions } from '@anthropic-ai/sdk'
import type { ChatMessage } from '@domain/chat/conversation'
import { FAI_PERSONALITY } from './personality'

// The only file that imports the AI service SDK (ADR-0017; lint and tests/architecture).

/** Owner's choice, 2026-11-18. */
export const CHAT_MODEL = 'claude-opus-5-5'

export const OFFICIAL_BASE_URL = 'https://api.anthropic.com'

/** On a safety refusal, the service retries the same request on another model, in the same call. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01'

/** Why a reply (or a key check) failed; the chat service turns it into a pt-BR message. */
export type ChatFailure =
  | 'offline'
  | 'timeout'
  | 'aborted'
  | 'invalid-key'
  | 'billing'
  | 'rate-limit'
  | 'unavailable'
  | 'refusal'
  | 'unknown'

export class ChatFailureError extends Error {
  constructor(readonly failure: ChatFailure) {
    super(`chat failed: ${failure}`)
    this.name = 'ChatFailureError'
  }
}

/** The parts of the SDK client this adapter uses. */
export interface ClaudeClientPort {
  readonly beta: { readonly messages: Pick<Anthropic['beta']['messages'], 'stream'> }
  readonly models: Pick<Anthropic['models'], 'retrieve'>
}

export interface ChatModel {
  /** Asks for Fai's reply to the open conversation; `onText` gets it piece by piece. */
  stream(
    messages: readonly ChatMessage[],
    options: { readonly onText: (text: string) => void; readonly signal: AbortSignal },
  ): Promise<string>
  /** Whether the service accepts the key, without spending tokens. */
  checkKey(): Promise<void>
}

/**
 * The key is passed in and nothing comes from the environment: no ANTHROPIC_API_KEY, auth token,
 * profile or ANTHROPIC_BASE_URL (which would send the key elsewhere), and no SDK logs, which could
 * print the conversation.
 */
export function claudeClientOptions(apiKey: string): ClientOptions {
  return {
    apiKey,
    authToken: null,
    baseURL: OFFICIAL_BASE_URL,
    timeout: 60_000,
    maxRetries: 1,
    logLevel: 'off',
  }
}

/** Most specific first: in this SDK the connection errors are subclasses of APIError. */
function failureOf(error: unknown): ChatFailure {
  if (error instanceof Anthropic.APIUserAbortError) {
    return 'aborted'
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return 'timeout'
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'offline'
  }
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return 'invalid-key'
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'rate-limit'
  }
  if (error instanceof Anthropic.InternalServerError) {
    return 'unavailable'
  }
  if (error instanceof Anthropic.APIError && error.status === 402) {
    return 'billing'
  }
  return 'unknown'
}

export function createClaudeChat(
  apiKey: string,
  makeClient: (options: ClientOptions) => ClaudeClientPort = (options) => new Anthropic(options),
): ChatModel {
  const client = makeClient(claudeClientOptions(apiKey))

  return {
    async stream(messages, { onText, signal }) {
      const stream = client.beta.messages.stream(
        {
          model: CHAT_MODEL,
          max_tokens: 4096,
          system: FAI_PERSONALITY,
          messages: messages.map((message) => ({
            role: message.role === 'fai' ? 'assistant' : 'user',
            content: message.text,
          })),
          output_config: { effort: 'low' },
          betas: [FALLBACK_BETA],
          fallbacks: 'default',
        },
        { signal },
      )
      stream.on('text', (delta) => {
        onText(delta)
      })
      let final: Awaited<ReturnType<typeof stream.finalMessage>>
      try {
        final = await stream.finalMessage()
      } catch (error) {
        throw new ChatFailureError(failureOf(error))
      }
      if (final.stop_reason === 'refusal') {
        throw new ChatFailureError('refusal')
      }
      return final.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('')
    },

    async checkKey() {
      try {
        await client.models.retrieve(CHAT_MODEL)
      } catch (error) {
        throw new ChatFailureError(failureOf(error))
      }
    },
  }
}
