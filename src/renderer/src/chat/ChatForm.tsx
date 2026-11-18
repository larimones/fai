import type { RefObject } from 'react'

interface ChatFormProps {
  readonly value: string
  readonly disabled: boolean
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly onChange: (text: string) => void
  readonly onSubmit: () => void
}

/** The message field: Enter or the button sends (CA3). */
export function ChatForm({ value, disabled, inputRef, onChange, onSubmit }: ChatFormProps) {
  return (
    <form
      className="chat-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <input
        ref={inputRef}
        className="field"
        type="text"
        value={value}
        disabled={disabled}
        placeholder="Diga algo para a Fai…"
        aria-label="Mensagem para a Fai"
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
      <button
        className="button button--accent"
        type="submit"
        disabled={disabled}
        aria-label="Enviar mensagem"
      >
        ➤
      </button>
    </form>
  )
}
