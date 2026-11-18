import type { ChatMode, ChatOpened, ChatPlaced } from '@shared/ipc/api'

/** A line on screen; the conversation itself lives in the main process (ADR-0017). */
export interface ChatLine {
  readonly id: number
  readonly role: 'user' | 'fai'
  readonly text: string
}

export interface ChatState {
  readonly mode: ChatMode | null
  readonly hasKey: boolean
  readonly keyPersists: boolean
  /** Bumped on each opening, so the field gets the focus again. */
  readonly opening: number
  readonly lines: readonly ChatLine[]
  readonly nextId: number
  /** Fai's reply as it arrives; null when no reply is coming in. */
  readonly streaming: string | null
  readonly waiting: boolean
  readonly notice: { readonly kind: 'alert' | 'status'; readonly message: string } | null
  readonly limitReached: boolean
  readonly text: string
  readonly key: string
  readonly savingKey: boolean
  readonly tail: ChatPlaced
}

export type ChatAction =
  | { readonly type: 'opened'; readonly opened: ChatOpened }
  | { readonly type: 'placed'; readonly placed: ChatPlaced }
  | { readonly type: 'typed'; readonly text: string }
  | { readonly type: 'keyTyped'; readonly key: string }
  | { readonly type: 'sent'; readonly text: string }
  | { readonly type: 'refused'; readonly message: string; readonly text: string }
  | { readonly type: 'delta'; readonly text: string }
  | { readonly type: 'end' }
  | { readonly type: 'failed'; readonly message: string; readonly text: string }
  | { readonly type: 'savingKey' }
  | { readonly type: 'keySaved' }
  | { readonly type: 'keyRefused'; readonly message: string }

export const INITIAL_CHAT_STATE: ChatState = {
  mode: null,
  hasKey: false,
  keyPersists: true,
  opening: 0,
  lines: [],
  nextId: 1,
  streaming: null,
  waiting: false,
  notice: null,
  limitReached: false,
  text: '',
  key: '',
  savingKey: false,
  tail: { tail: 'down', tailAt: 150 },
}

/** Takes the person's last line off the screen: its reply failed, so its text goes back to the field. */
function withoutLastUserLine(lines: readonly ChatLine[]): readonly ChatLine[] {
  return lines.at(-1)?.role === 'user' ? lines.slice(0, -1) : lines
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'opened':
      // Every opening is a new conversation (RF-18 CA3).
      return {
        ...INITIAL_CHAT_STATE,
        ...action.opened,
        opening: state.opening + 1,
        tail: state.tail,
      }
    case 'placed':
      return { ...state, tail: action.placed }
    case 'typed':
      return { ...state, text: action.text, notice: state.limitReached ? state.notice : null }
    case 'keyTyped':
      return { ...state, key: action.key, notice: null }
    case 'sent':
      return {
        ...state,
        lines: [...state.lines, { id: state.nextId, role: 'user', text: action.text }],
        nextId: state.nextId + 1,
        waiting: true,
        streaming: null,
        notice: null,
        text: '',
      }
    case 'refused':
    case 'failed':
      if (action.type === 'failed' && action.text === '') {
        // Not a failure: the 30-message notice after the last reply.
        return { ...state, notice: { kind: 'status', message: action.message }, limitReached: true }
      }
      return {
        ...state,
        lines: withoutLastUserLine(state.lines),
        waiting: false,
        streaming: null,
        notice: { kind: 'alert', message: action.message },
        text: action.text,
      }
    case 'delta':
      return { ...state, streaming: (state.streaming ?? '') + action.text }
    case 'end':
      return {
        ...state,
        lines: [...state.lines, { id: state.nextId, role: 'fai', text: state.streaming ?? '' }],
        nextId: state.nextId + 1,
        streaming: null,
        waiting: false,
      }
    case 'savingKey':
      return { ...state, savingKey: true, notice: null }
    case 'keySaved':
      return { ...state, mode: 'chat', hasKey: true, key: '', savingKey: false }
    case 'keyRefused':
      return { ...state, savingKey: false, notice: { kind: 'alert', message: action.message } }
  }
}
