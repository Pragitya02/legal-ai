import { RouterProvider } from 'react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'
import CursorSparkles from './component/CursorSparkles'
import { ThemeProvider } from './context/ThemeContext'
import { router } from './app/routes'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <CursorSparkles />
        <RouterProvider router={router} />
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
