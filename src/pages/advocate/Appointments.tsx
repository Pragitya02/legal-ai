import { useEffect, useState } from 'react'
import { isLoggedIn } from '../../lib/auth'
import {
  Video,
  MapPin,
  Calendar,
  Clock,
} from 'lucide-react'

// =====================================================
// API
// =====================================================

// Production API comes from Vercel environment variable:
// VITE_API_URL=https://legal-ai-z7vb.onrender.com
const API_URL = import.meta.env.VITE_API_URL

// =====================================================
// TYPES
// =====================================================

type AppointmentStatus = 'confirmed'

interface Appt {
  id: string
  name: string
  initials: string
  type: string
  time: string
  mode: string
  fee: number | null
  status: AppointmentStatus
  color: string
}

// =====================================================
// AVATAR COLORS
// =====================================================

const avatarColors = [
  '#2563EB',
  '#7C3AED',
  '#059669',
  '#EF4444',
  '#F59E0B',
  '#06B6D4',
]

// =====================================================
// INITIALS
// =====================================================

function getInitials(name: string) {
  if (!name) {
    return 'CL'
  }

  const parts = name.trim().split(/\s+/)

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase()
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(value: any) {
  if (!value) {
    return ''
  }

  try {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return String(value)
    }

    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Appointments() {
  const [appts, setAppts] = useState<Appt[]>([])

  const [filter, setFilter] = useState<
    'All' | 'confirmed'
  >('All')

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  // ===================================================
  // LOAD CONFIRMED APPOINTMENTS
  // ===================================================

  useEffect(() => {
    async function loadAppointments() {
      try {
        setLoading(true)
        setError('')

        if (!isLoggedIn()) {
          setError('Authentication required.')
          setLoading(false)
          return
        }

        if (!API_URL) {
          throw new Error(
            'API URL is not configured.'
          )
        }

        /*
         * IMPORTANT WORKFLOW
         *
         * Citizen books consultation
         *        ↓
         * Appointment status = pending
         *        ↓
         * Advocate → Consultation Requests
         *        ↓
         * Advocate accepts
         *        ↓
         * Appointment status = confirmed
         *        ↓
         * Appears here
         *
         * Therefore this page only displays
         * confirmed appointments.
         */

        const response = await fetch(
          `${API_URL}/api/appointments`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          throw new Error(
            `Failed to fetch appointments (${response.status})`
          )
        }

        const data = await response.json()

        if (!data || data.success !== true) {
          throw new Error(
            data?.message ||
              'Unable to fetch appointments'
          )
        }

        // =================================================
        // ONLY CONFIRMED APPOINTMENTS
        // =================================================

        const realAppointments = Array.isArray(
          data.appointments
        )
          ? data.appointments.filter(
              (appointment: any) =>
                String(
                  appointment.status || ''
                ).toLowerCase() === 'confirmed'
            )
          : []

        // =================================================
        // FORMAT REAL DATA
        // =================================================

        const formatted: Appt[] =
          realAppointments.map(
            (
              appointment: any,
              index: number
            ) => {
              const name =
                appointment.name ||
                appointment.clientName ||
                appointment.client_name ||
                appointment.fullName ||
                appointment.full_name ||
                appointment.citizen_name ||
                'Client'

              const rawFee =
                appointment.fee ??
                appointment.amount ??
                appointment.price ??
                null

              const fee =
                rawFee === null ||
                rawFee === undefined ||
                rawFee === ''
                  ? null
                  : Number(rawFee)

              const rawTime =
                appointment.time ||
                appointment.date ||
                appointment.appointmentDate ||
                appointment.appointment_date

              return {
                id: String(appointment.id),

                name,

                initials: getInitials(name),

                type:
                  appointment.type ||
                  appointment.caseType ||
                  appointment.case_type ||
                  appointment.case ||
                  'Legal Consultation',

                time: formatDate(rawTime),

                mode:
                  appointment.mode ||
                  appointment.meetingMode ||
                  appointment.meeting_mode ||
                  'Not specified',

                fee:
                  Number.isNaN(fee as number)
                    ? null
                    : fee,

                status: 'confirmed',

                color:
                  avatarColors[
                    index % avatarColors.length
                  ],
              }
            }
          )

        setAppts(formatted)
      } catch (err: any) {
        console.error(
          'APPOINTMENTS ERROR:',
          err
        )

        setAppts([])

        setError(
          err?.message ||
            'Unable to fetch appointments'
        )
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [])

  // ===================================================
  // COUNTS
  // ===================================================

  const confirmedCount = appts.length

  // ===================================================
  // FILTER
  // ===================================================

  const visible = appts.filter(
    (appointment) => {
      if (filter === 'All') {
        return true
      }

      return (
        appointment.status === filter
      )
    }
  )

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div
        className="page-enter"
        style={{
          padding: '50px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
        }}
      >
        Loading appointments...
      </div>
    )
  }

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <div className="page-enter">

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
          }}
        >
          Appointments
        </h1>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            marginTop: 2,
          }}
        >
          {confirmedCount} confirmed
        </p>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: '12px 14px',
            borderRadius: 9,
            background:
              'rgba(239,68,68,0.08)',
            border:
              '1px solid rgba(239,68,68,0.2)',
            color: '#EF4444',
            fontSize: '0.8rem',
          }}
        >
          {error}
        </div>
      )}

      {/* =================================================
          FILTERS
      ================================================= */}

      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 18,
        }}
      >
        {(
          ['All', 'confirmed'] as const
        ).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border:
                '1px solid var(--border)',
              textTransform: 'capitalize',
              background:
                filter === f
                  ? 'var(--emerald)'
                  : 'var(--bg-secondary)',
              color:
                filter === f
                  ? 'white'
                  : 'var(--text-muted)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* =================================================
          NO APPOINTMENTS
      ================================================= */}

      {appts.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '60px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background:
                'var(--emerald-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <Calendar
              size={24}
              color="var(--emerald)"
            />
          </div>

          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 5,
            }}
          >
            No confirmed appointments yet
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              maxWidth: 420,
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            New consultation requests will
            appear in Consultation Requests.
            Once you accept a request, the
            confirmed appointment will appear
            here.
          </div>
        </div>
      ) : visible.length === 0 ? (
        /* =================================================
           EMPTY FILTER
        ================================================= */

        <div
          className="card"
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          No appointments in this view.
        </div>
      ) : (
        /* =================================================
           APPOINTMENT LIST
        ================================================= */

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {visible.map((a) => (
            <div
              key={a.id}
              className="card"
              style={{
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >

              {/* AVATAR */}

              <div
                className="avatar"
                style={{
                  width: 42,
                  height: 42,
                  fontSize: '0.85rem',
                  background:
                    `linear-gradient(135deg, ${a.color}, ${a.color}88)`,
                }}
              >
                {a.initials}
              </div>

              {/* CLIENT */}

              <div
                style={{
                  flex: 1,
                  minWidth: 160,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                  }}
                >
                  {a.name}
                </div>

                <div
                  style={{
                    fontSize: '0.78rem',
                    color:
                      'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  {a.type}
                </div>
              </div>

              {/* DATE / TIME */}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.8rem',
                  color:
                    'var(--text-muted)',
                }}
              >
                <Calendar size={13} />

                {a.time || '__'}
              </div>

              {/* MODE */}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.8rem',
                  color:
                    'var(--text-muted)',
                }}
              >
                {a.mode === 'Video' ? (
                  <Video size={13} />
                ) : (
                  <MapPin size={13} />
                )}

                {a.mode || '__'}
              </div>

              {/* FEE */}

              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                }}
              >
                {a.fee === null
                  ? '__'
                  : `₹${a.fee.toLocaleString(
                      'en-IN'
                    )}`}
              </div>

              {/* STATUS */}

              <span
                className="badge"
                style={{
                  background:
                    'var(--emerald-subtle)',
                  color: 'var(--emerald)',
                }}
              >
                Confirmed
              </span>

            </div>
          ))}
        </div>
      )}

      {/* =================================================
          INFO
      ================================================= */}

      <div
        style={{
          marginTop: 20,
          padding: '12px 14px',
          borderRadius: 9,
          background:
            'var(--bg-secondary)',
          border:
            '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
        }}
      >
        <Clock
          size={15}
          color="var(--text-muted)"
        />

        <span
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}
        >
          Only confirmed appointments are
          displayed here. New requests must
          be accepted from Consultation Requests
          first.
        </span>
      </div>

    </div>
  )
}