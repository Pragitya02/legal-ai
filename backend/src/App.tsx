import { RouterProvider } from 'react-router'
import { ThemeProvider } from './context/ThemeContext'
import { router } from './app/routes'

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
