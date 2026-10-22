import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyMotion, applyTheme, resolveInitialMotion, resolveInitialTheme } from './shared/preferences/appearance'
import './index.css'

// index.html already sets these before paint; applying them again here keeps React's view and the
// DOM in step, even if the inline script was skipped.
applyTheme(resolveInitialTheme())
applyMotion(resolveInitialMotion())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
