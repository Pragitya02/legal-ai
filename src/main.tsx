import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ensureCsrfToken, installCsrfProtection } from './lib/csrf'

installCsrfProtection()

async function bootstrap() {
  // Render the application immediately.
  // Do not block the public UI while the backend wakes up.
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )

  // Initialize CSRF in the background.
  // Authenticated/state-changing requests will use it when available.
  try {
    await ensureCsrfToken()
  } catch (error) {
    console.warn('[CSRF] Background initialization failed:', error)
  }
}

void bootstrap()