import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import idleFrameUrl from './assets/fai-idle.png?inline'
import { loadFrame } from './mascot/load-frame'
import { MascotApp } from './MascotApp'
import './styles.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Elemento #root não encontrado.')
}

const loadIdleFrame = () => loadFrame(idleFrameUrl)

createRoot(container).render(
  <StrictMode>
    <MascotApp loadFrame={loadIdleFrame} />
  </StrictMode>,
)
