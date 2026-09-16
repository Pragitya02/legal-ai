import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Scale, Moon, Sun, Menu, X, Sparkles } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Find Advocates', href: '/dashboard/advocates' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
]

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--blue), #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-blue)',
            }}>
              <Scale size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                Nyaya<span style={{ color: 'var(--blue)' }}>AI</span>
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }} className="hidden lg:flex">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: location.pathname === link.href ? 'var(--blue)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  background: location.pathname === link.href ? 'var(--blue-subtle)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (location.pathname !== link.href) {
                    (e.target as HTMLElement).style.color = 'var(--text)'
                    ;(e.target as HTMLElement).style.background = 'var(--bg-secondary)'
                  }
                }}
                onMouseLeave={e => {
                  if (location.pathname !== link.href) {
                    (e.target as HTMLElement).style.color = 'var(--text-muted)'
                    ;(e.target as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
            <button
              onClick={toggle}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              to="/login"
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                color: 'var(--text)', textDecoration: 'none',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                transition: 'all 0.15s',
              }}
              className="hidden sm:inline-flex"
            >
              Login
            </Link>

            <Link
              to="/signup"
              className="btn-primary hidden sm:inline-flex"
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <Sparkles size={14} />
              Get Started
            </Link>

            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden"
              style={{
                width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text)',
              }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 0 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '10px 12px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 500,
                  color: 'var(--text-muted)', textDecoration: 'none',
                }}
              >
                {link.label}
              </a>
            ))}
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <Link to="/login" onClick={() => setMobileOpen(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, textAlign: 'center',
                  border: '1px solid var(--border)', color: 'var(--text)',
                  textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                }}>Login</Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)}
                className="btn-primary"
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, textAlign: 'center',
                  textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
                }}>Sign Up</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
