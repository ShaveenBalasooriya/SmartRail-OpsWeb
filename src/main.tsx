import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { sessionService } from './features/auth/api/session'
import { setAccessTokenProvider } from './shared/api/authBridge'
import { applyMotion, applyTheme, resolveInitialMotion, resolveInitialTheme } from './shared/preferences/appearance'
import './index.css'

// Registered before render so the callback route's /me request already carries the new token.
setAccessTokenProvider(() => sessionService.getAccessToken())

// index.html already sets these before paint; applying them again here keeps React's view and the
// DOM in step, even if the inline script was skipped.
applyTheme(resolveInitialTheme())
applyMotion(resolveInitialMotion())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
