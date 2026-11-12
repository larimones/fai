import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PanelApp } from './PanelApp'
import './panel.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Elemento #root não encontrado.')
}

createRoot(container).render(
  <StrictMode>
    <PanelApp />
  </StrictMode>,
)
