import { useEffect, useRef } from 'react'
import type { ChatLine } from './chat-state'

interface MessageListProps {
  readonly lines: readonly ChatLine[]
  readonly streaming: string | null
  readonly thinking: boolean
}

/** The open conversation, newest at the bottom; it scrolls when it grows long (RF-18 CA2). */
export function MessageList({ lines, streaming, thinking }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (element !== null) {
      element.scrollTop = element.scrollHeight
    }
  }, [lines, streaming, thinking])

  return (
    <div ref={scrollRef} className="messages">
      <ul className="messages__list" aria-label="Conversa" aria-live="polite">
        {lines.map((line) => (
          <li key={line.id} className={`message message--${line.role}`}>
            {line.text}
          </li>
        ))}
        {streaming !== null && <li className="message message--fai">{streaming}</li>}
      </ul>
      {thinking && <p className="messages__thinking">Fai está pensando…</p>}
    </div>
  )
}
