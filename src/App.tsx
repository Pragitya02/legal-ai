import { RouterProvider } from 'react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from './context/ThemeContext'
import { router } from './app/routes'
import GavelCursor from './components/GavelCursor'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <GavelCursor />
        <RouterProvider router={router} />
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
