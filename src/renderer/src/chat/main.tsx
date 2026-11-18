import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatApp } from './ChatApp'
import './chat.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Elemento #root não encontrado.')
}

createRoot(container).render(
  <StrictMode>
    <ChatApp />
  </StrictMode>,
)
