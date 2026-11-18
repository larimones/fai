import type { RefObject } from 'react'

interface KeyFormProps {
  readonly value: string
  readonly hasKey: boolean
  readonly keyPersists: boolean
  readonly saving: boolean
  readonly error: string | null
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly onChange: (key: string) => void
  readonly onSubmit: () => void
}

/** Asks for the AI service key, once (RF-19 CA1); it never comes back to this page. */
export function KeyForm(props: KeyFormProps) {
  const { value, hasKey, keyPersists, saving, error, inputRef } = props
  return (
    <form
      className="key-form"
      onSubmit={(event) => {
        event.preventDefault()
        props.onSubmit()
      }}
    >
      <p className="bubble__text">
        {hasKey
          ? 'Cole a nova chave do serviço de IA.'
          : 'Para conversarmos, preciso da chave do serviço de IA.'}
      </p>
      <p className="bubble__hint">
        Crie uma em console.anthropic.com, em “API Keys”. Cada mensagem gasta um pouquinho de
        crédito da sua conta.
      </p>
      {!keyPersists && (
        <p className="bubble__hint">
          Este computador não tem um cofre de senhas: a chave vale só até fechar a Fai.
        </p>
      )}
      <input
        ref={inputRef}
        className="field"
        type="password"
        value={value}
        autoComplete="off"
        spellCheck={false}
        aria-label="Chave do serviço de IA"
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : 'key-error'}
        onChange={(event) => {
          props.onChange(event.target.value)
        }}
      />
      {error !== null && (
        <p id="key-error" className="bubble__error" role="alert">
          {error}
        </p>
      )}
      <button className="button button--accent" type="submit" disabled={saving}>
        {saving ? 'Conferindo…' : 'Guardar chave'}
      </button>
    </form>
  )
}
