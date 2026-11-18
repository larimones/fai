import { useEffect, useReducer, useRef } from 'react'
import { ChatForm } from './ChatForm'
import { chatReducer, INITIAL_CHAT_STATE } from './chat-state'
import { KeyForm } from './KeyForm'
import { MessageList } from './MessageList'

/** The chat bubble (RF-18, RF-19, ADR-0017): a short conversation with Fai, shown as it arrives. */
export function ChatApp() {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_CHAT_STATE)
  const mainRef = useRef<HTMLElement>(null)
  const messageRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stops = [
      window.faiChat.onOpened((opened) => {
        dispatch({ type: 'opened', opened })
      }),
      window.faiChat.onPlaced((placed) => {
        dispatch({ type: 'placed', placed })
      }),
      window.faiChat.onReplyDelta((text) => {
        dispatch({ type: 'delta', text })
      }),
      window.faiChat.onReplyEnd(() => {
        dispatch({ type: 'end' })
      }),
      window.faiChat.onReplyError(({ message, text }) => {
        dispatch({ type: 'failed', message, text })
      }),
    ]
    return () => {
      for (const stop of stops) {
        stop()
      }
    }
  }, [])

  // The field is ready on each opening, after saving the key and when Fai finishes answering.
  useEffect(() => {
    if (state.mode === 'key') {
      keyRef.current?.focus()
    } else if (state.mode === 'chat' && !state.waiting) {
      messageRef.current?.focus()
    }
  }, [state.opening, state.mode, state.waiting])

  // A CSS variable set through the CSSOM: no inline style attribute (CSP, CLAUDE.md).
  useEffect(() => {
    mainRef.current?.style.setProperty('--tail-at', `${String(state.tail.tailAt)}px`)
  }, [state.tail.tailAt])

  const send = (): void => {
    const text = state.text.trim()
    if (text === '' || state.waiting || state.limitReached) {
      return
    }
    dispatch({ type: 'sent', text })
    void window.faiChat.send(text).then((result) => {
      if (!result.ok) {
        dispatch({ type: 'refused', message: result.error.message, text })
      }
    })
  }

  const saveKey = (): void => {
    const key = state.key.trim()
    if (key === '' || state.savingKey) {
      return
    }
    dispatch({ type: 'savingKey' })
    void window.faiChat.saveKey(key).then((result) => {
      dispatch(
        result.ok ? { type: 'keySaved' } : { type: 'keyRefused', message: result.error.message },
      )
    })
  }

  const notice = state.notice
  return (
    <main ref={mainRef} className={`bubble bubble--tail-${state.tail.tail}`}>
      <div className="bubble__body">
        <h1 className="bubble__title">✿ Fai</h1>
        {state.mode === 'key' ? (
          <KeyForm
            value={state.key}
            hasKey={state.hasKey}
            keyPersists={state.keyPersists}
            saving={state.savingKey}
            error={notice?.message ?? null}
            inputRef={keyRef}
            onChange={(key) => {
              dispatch({ type: 'keyTyped', key })
            }}
            onSubmit={saveKey}
          />
        ) : (
          <>
            <MessageList
              lines={state.lines}
              streaming={state.streaming}
              thinking={state.waiting && state.streaming === null}
            />
            {notice !== null && (
              <p
                className={notice.kind === 'alert' ? 'bubble__error' : 'bubble__notice'}
                role={notice.kind}
              >
                {notice.message}
              </p>
            )}
            <ChatForm
              value={state.text}
              disabled={state.waiting || state.limitReached}
              inputRef={messageRef}
              onChange={(text) => {
                dispatch({ type: 'typed', text })
              }}
              onSubmit={send}
            />
          </>
        )}
      </div>
    </main>
  )
}
