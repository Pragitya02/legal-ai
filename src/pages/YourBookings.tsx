import { useEffect, useMemo, useState } from 'react'
import { isLoggedIn } from '../lib/auth'
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle,
  XCircle,
  Hourglass,
  RefreshCw,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

type Appointment = {
  id: number | string
  appointment_date?: string
  appointmentDate?: string
  status?: string
  notes?: string | null
  advocate_name?: string
  advocate_email?: string
  lawyer_name?: string
  full_name?: string
}

function getStatus(appointment: Appointment) {
  const status = String(appointment.status || '').toLowerCase()
  const notes = String(appointment.notes || '').toLowerCase()

  if (status === 'confirmed') return 'confirmed'
  if (
    status === 'cancelled' &&
    (notes.includes('declined') || notes.includes('rejected'))
  ) {
    return 'rejected'
  }
  if (status === 'cancelled') return 'cancelled'
  if (status === 'completed') return 'completed'
  return 'pending'
}

function getStatusLabel(status: string) {
  if (status === 'confirmed') return 'Accepted'
  if (status === 'rejected') return 'Rejected'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'completed') return 'Completed'
  return 'Pending'
}

function getAppointmentDate(value?: string) {
  if (!value) return null

  const normalized = String(value).replace('T', ' ')
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/
  )

  if (!match) return null

  const [, year, month, day, hour = '00', minute = '00'] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  )
}

function formatDate(value?: string) {
  const date = getAppointmentDate(value)
  if (!date) return 'Date unavailable'

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(value?: string) {
  const date = getAppointmentDate(value)
  if (!date) return 'Time unavailable'

  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getAdvocateName(appointment: Appointment) {
  return (
    appointment.advocate_name ||
    appointment.lawyer_name ||
    appointment.full_name ||
    'Advocate'
  )
}

function getMode(notes?: string | null) {
  const value = String(notes || '').toLowerCase()

  if (value.includes('inperson') || value.includes('in-person')) {
    return 'In-Person'
  }

  return 'Video Call'
}

export default function YourBookings() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadBookings = async () => {
    try {
      setLoading(true)
      setError('')

      if (!isLoggedIn()) {
        setError('Please login to view your bookings.')
        return
      }

      const response = await fetch(`${API_URL}/api/appointments`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data?.message || 'Failed to load your bookings.')
      }

      setAppointments(
        Array.isArray(data.appointments) ? data.appointments : []
      )
    } catch (err: any) {
      console.error('YOUR BOOKINGS ERROR:', err)
      setError(err?.message || 'Failed to load your bookings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const aDate = getAppointmentDate(
        a.appointment_date || a.appointmentDate
      )?.getTime() || 0

      const bDate = getAppointmentDate(
        b.appointment_date || b.appointmentDate
      )?.getTime() || 0

      return bDate - aDate
    })
  }, [appointments])

  const pendingCount = appointments.filter(
    appointment => getStatus(appointment) === 'pending'
  ).length

  const acceptedCount = appointments.filter(
    appointment => getStatus(appointment) === 'confirmed'
  ).length

  const rejectedCount = appointments.filter(
    appointment => getStatus(appointment) === 'rejected'
  ).length
  const bookingSummary = [
  {
    label: 'Pending',
    count: pendingCount,
    Icon: Hourglass,
    color: '#D97706',
  },
  {
    label: 'Accepted',
    count: acceptedCount,
    Icon: CheckCircle,
    color: '#059669',
  },
  {
    label: 'Rejected',
    count: rejectedCount,
    Icon: XCircle,
    color: '#DC2626',
  },
]

  const statusStyles: Record<string, { color: string; background: string }> = {
    pending: {
      color: '#D97706',
      background: 'rgba(245, 158, 11, 0.12)',
    },
    confirmed: {
      color: '#059669',
      background: 'rgba(16, 185, 129, 0.12)',
    },
    rejected: {
      color: '#DC2626',
      background: 'rgba(239, 68, 68, 0.12)',
    },
    cancelled: {
      color: '#6B7280',
      background: 'rgba(107, 114, 128, 0.12)',
    },
    completed: {
      color: '#2563EB',
      background: 'rgba(37, 99, 235, 0.12)',
    },
  }

  return (
    <div className="page-enter">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.7rem',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: 6,
            }}
          >
            Your Bookings
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            Track your consultation requests and see whether the advocate has
            accepted or rejected them.
          </p>
        </div>

        <button
          onClick={loadBookings}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 14px',
            borderRadius: 9,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text)',
            cursor: loading ? 'default' : 'pointer',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
        className="three-col-grid"
      >
        {bookingSummary.map(({ label, count, Icon, color }) => (
          <div
            key={String(label)}
            className="card"
            style={{
              padding: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${color}18`,
              }}
            >
              <Icon size={20} style={{ color }} />
            </div>

            <div>
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--text)',
                }}
              >
                {count}
              </div>

              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          Loading your bookings...
        </div>
      )}

      {!loading && error && (
        <div
          className="card"
          style={{
            padding: 28,
            textAlign: 'center',
          }}
        >
          <XCircle
            size={30}
            style={{ color: '#DC2626', marginBottom: 10 }}
          />
          <div
            style={{
              color: 'var(--text)',
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Unable to load bookings
          </div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              marginBottom: 16,
            }}
          >
            {error}
          </div>

          <button
            onClick={loadBookings}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && sortedAppointments.length === 0 && (
        <div
          className="card"
          style={{
            padding: 50,
            textAlign: 'center',
          }}
        >
          <Calendar
            size={38}
            style={{
              color: 'var(--text-muted)',
              marginBottom: 12,
            }}
          />

          <h2
            style={{
              color: 'var(--text)',
              fontSize: '1.05rem',
              marginBottom: 7,
            }}
          >
            No bookings yet
          </h2>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            Your consultation requests will appear here after you send a
            booking request to an advocate.
          </p>
        </div>
      )}

      {!loading && !error && sortedAppointments.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {sortedAppointments.map(appointment => {
            const status = getStatus(appointment)
            const statusStyle =
              statusStyles[status] || statusStyles.pending

            const dateValue =
              appointment.appointment_date ||
              appointment.appointmentDate

            return (
              <div
                key={appointment.id}
                className="card"
                style={{
                  padding: 20,
                  border:
                    status === 'pending'
                      ? '1px solid rgba(245, 158, 11, 0.28)'
                      : '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          color: 'var(--text)',
                          fontSize: '1rem',
                          fontWeight: 750,
                        }}
                      >
                        Consultation with Adv. {getAdvocateName(appointment)}
                      </h2>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 9px',
                          borderRadius: 999,
                          background: statusStyle.background,
                          color: statusStyle.color,
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status === 'confirmed' && <CheckCircle size={13} />}
                        {status === 'rejected' && <XCircle size={13} />}
                        {status === 'pending' && <Hourglass size={13} />}
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {status === 'pending' &&
                        'Waiting for the advocate to review your request.'}

                      {status === 'confirmed' &&
                        'The advocate accepted your consultation request.'}

                      {status === 'rejected' &&
                        'The advocate rejected your consultation request.'}

                      {status === 'cancelled' &&
                        'This consultation was cancelled.'}

                      {status === 'completed' &&
                        'This consultation has been completed.'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(3, minmax(0, 1fr))',
                    gap: 10,
                    marginTop: 18,
                  }}
                  className="three-col-grid"
                >
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 9,
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        marginBottom: 4,
                      }}
                    >
                      DATE
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        color: 'var(--text)',
                        fontSize: '0.82rem',
                        fontWeight: 650,
                      }}
                    >
                      <Calendar size={14} />
                      {formatDate(dateValue)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 9,
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        marginBottom: 4,
                      }}
                    >
                      TIME
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        color: 'var(--text)',
                        fontSize: '0.82rem',
                        fontWeight: 650,
                      }}
                    >
                      <Clock size={14} />
                      {formatTime(dateValue)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 9,
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        marginBottom: 4,
                      }}
                    >
                      MODE
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        color: 'var(--text)',
                        fontSize: '0.82rem',
                        fontWeight: 650,
                      }}
                    >
                      {getMode(appointment.notes) === 'Video Call' ? (
                        <Video size={14} />
                      ) : (
                        <MapPin size={14} />
                      )}
                      {getMode(appointment.notes)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .three-col-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
