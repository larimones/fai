import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import sheetMetadata from './assets/fai-sheet.json'
import sheetUrl from './assets/fai-sheet.png?inline'
import { loadSpriteSheet } from './mascot/load-sprite-sheet'
import { MascotApp } from './MascotApp'
import './styles.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Elemento #root não encontrado.')
}

const loadSheet = () => loadSpriteSheet(sheetUrl, sheetMetadata)

createRoot(container).render(
  <StrictMode>
    <MascotApp loadSheet={loadSheet} />
  </StrictMode>,
)
