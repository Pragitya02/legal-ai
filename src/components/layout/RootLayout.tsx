import { Outlet } from 'react-router'
import Navbar from './Navbar'

export default function RootLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
