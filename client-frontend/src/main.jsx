import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fontes self-hosted: sem round-trip a domínios de terceiros e só os pesos usados.
import '@fontsource/archivo/latin-400.css'
import '@fontsource/archivo/latin-500.css'
import '@fontsource/archivo/latin-600.css'
import '@fontsource/archivo/latin-700.css'
import './material-icons.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
