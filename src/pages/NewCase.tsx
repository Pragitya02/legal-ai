import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { isLoggedIn } from '../lib/auth'
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Scale,
  ShieldAlert,
  Loader2,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const categories = [
  'General Legal Matter',
  'Criminal Law',
  'Civil Law',
  'Property Law',
  'Family Law',
  'Consumer Law',
  'Employment Law',
  'Cyber Law',
  'Corporate Law',
  'Constitutional Law',
  'Other',
]

const severities = ['Low', 'Medium', 'High', 'Critical']

export default function NewCase() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General Legal Matter')
  const [severity, setSeverity] = useState('Medium')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      alert('Please enter a case name.')
      return
    }

    if (!description.trim()) {
      alert('Please describe your legal matter.')
      return
    }

    if (!isLoggedIn()) {
      alert('Please login again.')
      navigate('/login')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`${API_BASE}/api/cases`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          severity,
          status: 'open',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create case.')
      }

      const newCaseId = Number(data.caseId)

      if (!newCaseId) {
        throw new Error('Case was created but no case ID was returned.')
      }

      navigate(`/dashboard/cases/${newCaseId}`)
    } catch (error) {
      console.error('CREATE CASE ERROR:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to create case.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-enter" style={{ maxWidth: 900, margin: '0 auto' }}>
      <button
        type="button"
        onClick={() => navigate('/dashboard/cases')}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 22,
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={16} />
        Back to My Cases
      </button>

      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: 'var(--blue-subtle)',
            color: 'var(--blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Briefcase size={22} />
        </div>

        <h1
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.035em',
            margin: 0,
          }}
        >
          Create a New Case
        </h1>

        <p
          style={{
            marginTop: 7,
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            maxWidth: 650,
          }}
        >
          Create a dedicated workspace for your legal matter.
          Documents, AI analysis, conversations and notes can
          be organized inside this case.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className="card"
          style={{
            padding: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              marginBottom: 20,
            }}
          >
            <FileText size={18} color="var(--blue)" />

            <h2
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 750,
                color: 'var(--text)',
              }}
            >
              Case Information
            </h2>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 7,
                fontSize: '0.82rem',
                fontWeight: 650,
                color: 'var(--text)',
              }}
            >
              Case Name
            </label>

            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Property dispute with landlord"
              maxLength={150}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 7,
                fontSize: '0.82rem',
                fontWeight: 650,
                color: 'var(--text)',
              }}
            >
              Describe Your Legal Matter
            </label>

            <textarea
              className="input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain what happened, who is involved, important dates, and what help you need..."
              rows={7}
              maxLength={5000}
              disabled={loading}
              style={{
                resize: 'vertical',
                minHeight: 150,
                lineHeight: 1.55,
              }}
            />

            <div
              style={{
                marginTop: 5,
                textAlign: 'right',
                color: 'var(--text-subtle)',
                fontSize: '0.7rem',
              }}
            >
              {description.length}/5000
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 7,
                  fontSize: '0.82rem',
                  fontWeight: 650,
                  color: 'var(--text)',
                }}
              >
                Legal Category
              </label>

              <select
                className="input"
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={loading}
              >
                {categories.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 7,
                  fontSize: '0.82rem',
                  fontWeight: 650,
                  color: 'var(--text)',
                }}
              >
                Priority
              </label>

              <select
                className="input"
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                disabled={loading}
              >
                {severities.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 18,
            marginBottom: 18,
            display: 'flex',
            gap: 11,
            alignItems: 'flex-start',
          }}
        >
          <ShieldAlert
            size={18}
            color="var(--blue)"
            style={{ flexShrink: 0, marginTop: 2 }}
          />

          <div>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 3,
              }}
            >
              Your case becomes a private workspace
            </div>

            <div
              style={{
                fontSize: '0.76rem',
                lineHeight: 1.55,
                color: 'var(--text-muted)',
              }}
            >
              Once created, you can manage information related to
              this matter from its dedicated case workspace.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 9,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard/cases')}
            disabled={loading}
            style={{
              padding: '10px 17px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              fontWeight: 650,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              padding: '10px 19px',
              borderRadius: 9,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2
                  size={15}
                  style={{
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Creating Case...
              </>
            ) : (
              <>
                <Scale size={15} />
                Create Case
              </>
            )}
          </button>
        </div>
      </form>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @media (max-width: 650px) {
            .case-form-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  )
}