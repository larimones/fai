import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import sheetMetadata from './assets/fai-sheet.json'
import sheetMasks from './assets/fai-sheet.masks.json'
import sheetUrl from './assets/fai-sheet.png'
import { loadSpriteSheet } from './mascot/load-sprite-sheet'
import { MascotApp } from './MascotApp'
import './styles.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Elemento #root não encontrado.')
}

const loadSheet = () =>
  loadSpriteSheet({ imageUrl: sheetUrl, metadata: sheetMetadata, masks: sheetMasks })

createRoot(container).render(
  <StrictMode>
    <MascotApp loadSheet={loadSheet} />
  </StrictMode>,
)
