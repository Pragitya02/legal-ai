import type { ReactNode } from 'react'
import { Link } from 'react-router'

// Shared, minimal layout for the public legal pages (black and gold).
// Anything wrapped in <Placeholder> is text the site owner must replace.

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        background: 'rgba(194, 118, 53, 0.15)',
        border: '1px dashed #C27635',
        borderRadius: 4,
        padding: '1px 6px',
        color: '#E3A15F',
        fontWeight: 600,
      }}
    >
      [{children}]
    </span>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#C27635', marginBottom: 10 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  )
}

export default function LegalPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div style={{ background: '#000000', minHeight: '100vh', padding: '56px 24px 96px' }}>
      <article style={{ maxWidth: 780, margin: '0 auto', color: '#D6D6D6', fontSize: '0.95rem', lineHeight: 1.75 }}>
        <Link to="/" style={{ color: '#C27635', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
          ← Back to home
        </Link>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, color: '#F5F1E8', margin: '20px 0 8px' }}>{title}</h1>
        <p style={{ fontSize: '0.8rem', color: '#A3A3A3' }}>
          Last updated: <Placeholder>ADD DATE</Placeholder>
        </p>
        {intro && <p style={{ marginTop: 20 }}>{intro}</p>}
        {children}
      </article>
    </div>
  )
}
