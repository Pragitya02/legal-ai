import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react'

type Theme = 'dark'

const ThemeContext = createContext<{
  theme: Theme
}>({
  theme: 'dark',
})

export function ThemeProvider({
  children,
}: {
  children: ReactNode
}) {
  useEffect(() => {
    // Nyaya AI uses a permanent dark theme.
    document.documentElement.classList.add('dark')

    // Remove any old light-theme preference from previous versions.
    localStorage.removeItem('nyaya-theme')
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        theme: 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () =>
  useContext(ThemeContext)