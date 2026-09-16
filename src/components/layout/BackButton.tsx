import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

export default function BackButton() {
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <button
      onClick={handleBack}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid rgba(212, 175, 55, 0.45)',
        background: '#0b0b0b',
        color: '#D4AF37',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          'rgba(212, 175, 55, 0.10)'
        e.currentTarget.style.borderColor = '#D4AF37'
        e.currentTarget.style.boxShadow =
          '0 0 12px rgba(212, 175, 55, 0.18)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#0b0b0b'
        e.currentTarget.style.borderColor =
          'rgba(212, 175, 55, 0.45)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <ArrowLeft size={16} />
      Back
    </button>
  )
}