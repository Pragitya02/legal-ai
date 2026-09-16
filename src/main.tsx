import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ensureCsrfToken, installCsrfProtection } from './lib/csrf'

// Attach the CSRF header to state-changing requests to our
// own backend. See src/lib/csrf.ts for details.
installCsrfProtection()

async function bootstrap() {
  // Obtain the backend-domain CSRF token before the app can make
  // authenticated state-changing requests. The token itself is
  // kept only in memory; the backend also stores it in its cookie.
  await ensureCsrfToken()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap()
