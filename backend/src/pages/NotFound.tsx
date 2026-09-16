import { Link } from 'react-router'
import { Scale, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24, textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: 'linear-gradient(135deg, var(--blue), #7C3AED)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
        boxShadow: 'var(--shadow-blue)',
      }}>
        <Scale size={36} color="white" />
      </div>
      <div style={{ fontSize: '5rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.05em', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '12px 0 8px' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6 }}>
        The page you are looking for does not exist or has been moved. Let us take you back to justice.
      </p>
      <Link to="/" className="btn-primary"
        style={{
          marginTop: 28, padding: '12px 24px', borderRadius: 12, textDecoration: 'none',
          fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
        <ArrowLeft size={16} /> Back to Home
      </Link>
    </div>
  )
}
