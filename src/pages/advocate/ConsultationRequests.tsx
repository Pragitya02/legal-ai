import { useEffect, useMemo, useState } from 'react'
import { isLoggedIn } from '../../lib/auth'
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Video,
  MapPin,
  RefreshCw
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

type RequestItem = {
  id: number
  citizen_id: number
  lawyer_id: number
  appointment_date: string
  status: string
  requestStatus?: string
  notes?: string
  citizen_name?: string
  citizen_email?: string
  advocate_name?: string
}

function getMode(notes?: string) {
  const match = String(notes || '').match(/mode=([^;]+)/i)
  return match?.[1] === 'inperson' ? 'In-Person' : 'Video Call'
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatTime(value: string) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

export default function ConsultationRequests() {
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError('')

      if (!isLoggedIn()) {
        setError('Please login as an advocate to view consultation requests.')
        return
      }

      const response = await fetch(`${API_URL}/api/appointments`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data?.message || 'Failed to load consultation requests.')
      }

      const pending = Array.isArray(data.appointments)
        ? data.appointments.filter(
            (item: RequestItem) => item.status === 'pending'
          )
        : []

      setRequests(pending)
    } catch (err: any) {
      console.error('LOAD CONSULTATION REQUESTS ERROR:', err)
      setError(err?.message || 'Failed to load consultation requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const pendingCount = requests.length

  const respond = async (id: number, action: 'accept' | 'decline') => {
    try {
      setRespondingId(id)

      const response = await fetch(
        `${API_URL}/api/appointments/${id}/respond`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action })
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message ||
          `Failed to ${action} consultation request.`
        )
      }

      setRequests(prev =>
        prev.filter(request => request.id !== id)
      )
    } catch (err: any) {
      console.error('RESPOND CONSULTATION REQUEST ERROR:', err)
      alert(
        err?.message ||
        `Failed to ${action} consultation request.`
      )
    } finally {
      setRespondingId(null)
    }
  }

  const stats = useMemo(
    () => ({
      pending: pendingCount,
      accepted: 0,
      declined: 0
    }),
    [pendingCount]
  )

  return (
    <div
      className="page-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: 6
            }}
          >
            Consultation Requests
          </h1>
          <p
            style={{
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            Review consultation requests from citizens and decide whether to accept or decline them.
          </p>
        </div>

        <button
          onClick={loadRequests}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14
        }}
        className="consultation-request-stats"
      >
        {[
          ['Pending', stats.pending, Clock],
          ['Accepted', stats.accepted, CheckCircle],
          ['Declined', stats.declined, XCircle]
        ].map(([label, value, Icon]: any) => (
          <div
            key={label}
            className="card"
            style={{
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-secondary)',
                color: 'var(--gold)'
              }}
            >
              <Icon size={20} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--text)'
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}
              >
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div
          className="card"
          style={{
            padding: 18,
            border: '1px solid rgba(239,68,68,0.35)',
            color: 'var(--text)'
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}
        >
          Loading consultation requests...
        </div>
      ) : requests.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)'
            }}
          >
            <Calendar size={28} />
          </div>

          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '1.1rem',
              color: 'var(--text)'
            }}
          >
            No consultation requests yet
          </h2>

          <p
            style={{
              margin: 0,
              color: 'var(--text-muted)',
              lineHeight: 1.6
            }}
          >
            New citizen requests will appear here when someone requests a consultation with you.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          {requests.map(request => (
            <div
              key={request.id}
              className="card"
              style={{
                padding: 22
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  flexWrap: 'wrap',
                  marginBottom: 18
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      marginBottom: 6
                    }}
                  >
                    <User size={18} style={{ color: 'var(--gold)' }} />
                    <strong
                      style={{
                        color: 'var(--text)',
                        fontSize: '1rem'
                      }}
                    >
                      {request.citizen_name || 'Citizen'}
                    </strong>
                  </div>

                  {request.citizen_email && (
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem'
                      }}
                    >
                      {request.citizen_email}
                    </div>
                  )}
                </div>

                <span
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'var(--gold-subtle, rgba(212,175,55,0.12))',
                    color: 'var(--gold)',
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}
                >
                  PENDING
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                  marginBottom: 20
                }}
                className="consultation-request-details"
              >
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'var(--bg-secondary)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      marginBottom: 5
                    }}
                  >
                    <Calendar size={14} />
                    Date
                  </div>
                  <strong style={{ color: 'var(--text)' }}>
                    {formatDate(request.appointment_date)}
                  </strong>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'var(--bg-secondary)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      marginBottom: 5
                    }}
                  >
                    <Clock size={14} />
                    Time
                  </div>
                  <strong style={{ color: 'var(--text)' }}>
                    {formatTime(request.appointment_date)}
                  </strong>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'var(--bg-secondary)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      marginBottom: 5
                    }}
                  >
                    {getMode(request.notes) === 'Video Call' ? (
                      <Video size={14} />
                    ) : (
                      <MapPin size={14} />
                    )}
                    Mode
                  </div>
                  <strong style={{ color: 'var(--text)' }}>
                    {getMode(request.notes)}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  flexWrap: 'wrap'
                }}
              >
                <button
                  onClick={() => respond(request.id, 'decline')}
                  disabled={respondingId === request.id}
                  style={{
                    padding: '11px 18px',
                    borderRadius: 10,
                    border: '1px solid rgba(239,68,68,0.45)',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: respondingId === request.id ? 'not-allowed' : 'pointer',
                    fontWeight: 800
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <XCircle size={16} />
                    Decline
                  </span>
                </button>

                <button
                  onClick={() => respond(request.id, 'accept')}
                  disabled={respondingId === request.id}
                  className="btn-primary"
                  style={{
                    padding: '11px 20px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: respondingId === request.id ? 'not-allowed' : 'pointer',
                    fontWeight: 800
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <CheckCircle size={16} />
                    {respondingId === request.id ? 'Updating...' : 'Accept'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 800px) {
          .consultation-request-stats,
          .consultation-request-details {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
