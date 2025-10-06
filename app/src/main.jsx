import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ColorPaletteExtractor from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorPaletteExtractor />
  </StrictMode>,
)
