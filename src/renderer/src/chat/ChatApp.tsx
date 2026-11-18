import { useEffect, useState } from 'react'
import type { ChatMode } from '@shared/ipc/api'

/** Provisional bubble (T7.10): shows which mode it opened in; the real interface comes in T7.11. */
export function ChatApp() {
  const [mode, setMode] = useState<ChatMode | null>(null)

  useEffect(
    () =>
      window.faiChat.onOpened((opened) => {
        setMode(opened.mode)
      }),
    [],
  )

  return (
    <main className="bubble">
      <h1 className="bubble__title">✿ Fai</h1>
      <p>{mode === 'key' ? 'Cole a chave do serviço de IA.' : 'Vamos conversar?'}</p>
    </main>
  )
}
