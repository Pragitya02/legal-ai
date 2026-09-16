import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  MessageSquare,
  Upload,
  Users,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Star,
  MapPin,
  ArrowRight,
  Zap,
  Calendar,
} from 'lucide-react'

const quickActions = [
  {
    icon: Plus,
    label: 'Start New Case',
    desc: 'Describe your legal issue',
    href: '/dashboard/ai-assistant',
    color: 'var(--blue)',
    bg: 'var(--blue-subtle)',
  },
  {
    icon: Upload,
    label: 'Upload Document',
    desc: 'FIR, contract, court order',
    href: '/dashboard/documents',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: MessageSquare,
    label: 'Chat with AI',
    desc: 'Get instant legal guidance',
    href: '/dashboard/ai-assistant',
    color: 'var(--emerald)',
    bg: 'var(--emerald-subtle)',
  },
  {
    icon: Users,
    label: 'Find Advocate',
    desc: '1,840+ verified advocates',
    href: '/dashboard/advocates',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
  },
]

const recentActivity = [
  {
    icon: MessageSquare,
    title: 'AI consultation on property dispute',
    time: '2 hours ago',
    status: 'completed',
    color: 'var(--blue)',
  },
  {
    icon: FileText,
    title: 'Rental agreement analyzed',
    time: '1 day ago',
    status: 'completed',
    color: 'var(--emerald)',
  },
  {
    icon: Users,
    title: 'Consultation booked – Adv. Kavita Srinivasan',
    time: '2 days ago',
    status: 'upcoming',
    color: '#7C3AED',
  },
  {
    icon: AlertCircle,
    title: 'Security deposit case — awaiting document upload',
    time: '3 days ago',
    status: 'pending',
    color: '#F59E0B',
  },
  {
    icon: CheckCircle,
    title: 'Consumer complaint filed successfully',
    time: '1 week ago',
    status: 'completed',
    color: 'var(--emerald)',
  },
]

const statusConfig = {
  completed: {
    label: 'Done',
    color: 'var(--emerald)',
    bg: 'var(--emerald-subtle)',
  },
  upcoming: {
    label: 'Upcoming',
    color: 'var(--blue)',
    bg: 'var(--blue-subtle)',
  },
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
  },
}

const recommendedAdvocates = [
  {
    name: 'Adv. Kavita Srinivasan',
    initials: 'KS',
    speciality: 'Property & Real Estate Law',
    rating: 4.9,
    cases: 312,
    city: 'Delhi HC',
    fee: 1500,
    available: true,
    color: '#2563EB',
  },
  {
    name: 'Adv. Aman Joshi',
    initials: 'AJ',
    speciality: 'Employment & Labour Law',
    rating: 4.7,
    cases: 198,
    city: 'Bombay HC',
    fee: 1200,
    available: true,
    color: '#7C3AED',
  },
  {
    name: 'Adv. Nalini Bose',
    initials: 'NB',
    speciality: 'Consumer & Family Law',
    rating: 4.8,
    cases: 245,
    city: 'Calcutta HC',
    fee: 1000,
    available: false,
    color: '#059669',
  },
]

const API_BASE = 'https://legal-ai-z7vb.onrender.com'

type CaseItem = {
  id: string | number
  title: string
  type: string
  status: string
  progress: number
}

function getToken() {
  return localStorage.getItem('token')
}

function normalizeStatus(status: any) {
  const value = String(status || 'open').toLowerCase()

  if (
    value === 'resolved' ||
    value === 'closed' ||
    value === 'completed'
  ) {
    return 'Resolved'
  }

  if (
    value === 'pending' ||
    value === 'in_progress' ||
    value === 'in progress'
  ) {
    return 'Pending'
  }

  return 'Active'
}

function getProgress(status: any) {
  const value = String(status || 'open').toLowerCase()

  if (
    value === 'resolved' ||
    value === 'closed' ||
    value === 'completed'
  ) {
    return 100
  }

  if (
    value === 'pending' ||
    value === 'in_progress' ||
    value === 'in progress'
  ) {
    return 50
  }

  return 20
}

function normalizeCase(item: any, index: number): CaseItem {
  const status = normalizeStatus(
    item.status || item.case_status
  )

  return {
    id:
      item.id ??
      item.case_id ??
      item.caseId ??
      `CASE-${index + 1}`,
    title:
      item.title ||
      item.case_title ||
      item.name ||
      'Untitled Legal Case',
    type:
      item.type ||
      item.category ||
      item.case_type ||
      'General Legal Matter',
    status,
    progress:
      typeof item.progress === 'number'
        ? item.progress
        : getProgress(
            item.status || item.case_status
          ),
  }
}

export default function CitizenDashboard() {
  // Get logged-in user's information
  const savedUser = JSON.parse(
    localStorage.getItem('user') || '{}'
  )

  const userName = savedUser.fullName || 'User'

  const [myCases, setMyCases] = useState<CaseItem[]>([])
  const [casesLoading, setCasesLoading] = useState(true)
  const [casesError, setCasesError] = useState('')

  useEffect(() => {
    loadMyCases()
  }, [])

  const loadMyCases = async () => {
    const token = getToken()

    if (!token) {
      setCasesLoading(false)
      setCasesError('Please log in to view your cases.')
      return
    }

    try {
      setCasesLoading(true)
      setCasesError('')

      const response = await fetch(
        `${API_BASE}/api/cases`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to load cases'
        )
      }

      // Supports { cases: [...] } as well as a direct array.
      const rawCases = Array.isArray(data)
        ? data
        : Array.isArray(data.cases)
        ? data.cases
        : Array.isArray(data.data)
        ? data.data
        : []

      setMyCases(
        rawCases.map((item: any, index: number) =>
          normalizeCase(item, index)
        )
      )
    } catch (error: any) {
      console.error('GET MY CASES ERROR:', error)
      setCasesError(
        error?.message || 'Unable to load your cases.'
      )
      setMyCases([])
    } finally {
      setCasesLoading(false)
    }
  }

  const activeCasesCount = myCases.filter(
    (c) => c.status === 'Active'
  ).length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
      className="page-enter"
    >
      {/* Welcome */}
      <div
        style={{
          borderRadius: 'var(--radius)',
          padding: '28px 32px',
          background:
            'linear-gradient(135deg, #1E40AF 0%, #7C3AED 60%, #1E3A8A 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Welcome back 👋
            </div>

            <h1
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'white',
                letterSpacing: '-0.03em',
                marginBottom: 8,
              }}
            >
              {userName}
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.9rem',
              }}
            >
              You have{' '}
              <strong style={{ color: 'white' }}>
                {activeCasesCount} active case
                {activeCasesCount === 1 ? '' : 's'}
              </strong>{' '}
              and{' '}
              <strong style={{ color: 'white' }}>
                1 upcoming appointment
              </strong>{' '}
              this week.
            </p>
          </div>

          <Link
            to="/dashboard/ai-assistant"
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backdropFilter: 'blur(10px)',
            }}
          >
            <Zap size={15} />
            Ask AI Assistant
          </Link>
        </div>

        {/* Mini stats */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 24,
            flexWrap: 'wrap',
          }}
        >
          {[
            {
              val: String(myCases.length),
              lbl: 'Total Cases',
            },
            {
              val: String(activeCasesCount),
              lbl: 'Active',
            },
            { val: '5', lbl: 'AI Consultations' },
            { val: '2', lbl: 'Documents' },
          ].map((s) => (
            <div
              key={s.lbl}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: 'white',
                }}
              >
                {s.val}
              </div>

              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 1,
                }}
              >
                {s.lbl}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 14,
          }}
        >
          Quick Actions
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}
          className="qa-grid"
        >
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.href}
              className="card card-interactive"
              style={{
                padding: '20px 18px',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: a.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <a.icon
                  size={20}
                  style={{ color: a.color }}
                  strokeWidth={2}
                />
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                  }}
                >
                  {a.label}
                </div>

                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  {a.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Cases + Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
        }}
        className="two-col-grid"
      >
        {/* My Cases */}
        <div className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h2
              style={{
                fontWeight: 700,
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            >
              My Cases
            </h2>

            <Link
              to="/dashboard/cases"
              style={{
                fontSize: '0.8rem',
                color: 'var(--blue)',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {casesLoading ? (
              <div
                style={{
                  padding: '28px 14px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                }}
              >
                Loading your cases...
              </div>
            ) : casesError ? (
              <div
                style={{
                  padding: '18px 14px',
                  borderRadius: 10,
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  color: '#F59E0B',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                }}
              >
                {casesError}
              </div>
            ) : myCases.length === 0 ? (
              <div
                style={{
                  padding: '28px 14px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <FileText
                  size={24}
                  style={{
                    color: 'var(--text-subtle)',
                    marginBottom: 8,
                  }}
                />

                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    marginBottom: 4,
                  }}
                >
                  No cases yet
                </div>

                <div
                  style={{
                    fontSize: '0.72rem',
                    marginBottom: 12,
                  }}
                >
                  Start a legal case with NyayaAI and it will appear here.
                </div>

                <Link
                  to="/dashboard/ai-assistant"
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={13} />
                  Start New Case
                </Link>
              </div>
            ) : (
              myCases.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--text)',
                          fontSize: '0.85rem',
                        }}
                      >
                        {c.title}
                      </div>

                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginTop: 2,
                        }}
                      >
                        {c.id} · {c.type}
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        background:
                          c.status === 'Active'
                            ? 'var(--blue-subtle)'
                            : c.status === 'Resolved'
                            ? 'var(--emerald-subtle)'
                            : 'rgba(245,158,11,0.1)',
                        color:
                          c.status === 'Active'
                            ? 'var(--blue)'
                            : c.status === 'Resolved'
                            ? 'var(--emerald)'
                            : '#F59E0B',
                      }}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: 'var(--border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${c.progress}%`,
                        borderRadius: 2,
                        background:
                          c.status === 'Resolved'
                            ? 'var(--emerald)'
                            : c.status === 'Active'
                            ? 'var(--blue)'
                            : '#F59E0B',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-subtle)',
                      marginTop: 4,
                    }}
                  >
                    {c.progress}% complete
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h2
              style={{
                fontWeight: 700,
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            >
              Recent Activity
            </h2>

            <Clock
              size={16}
              style={{ color: 'var(--text-muted)' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {recentActivity.map((a, i) => {
              const sc =
                statusConfig[
                  a.status as keyof typeof statusConfig
                ]

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    paddingBottom: 16,
                    position: 'relative',
                  }}
                >
                  {/* Timeline line */}
                  {i < recentActivity.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: 28,
                        bottom: 0,
                        width: 1,
                        background: 'var(--border)',
                      }}
                    />
                  )}

                  {/* Icon */}
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: `color-mix(in srgb, ${a.color} 12%, transparent)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <a.icon
                      size={12}
                      style={{ color: a.color }}
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: 'var(--text)',
                        lineHeight: 1.4,
                      }}
                    >
                      {a.title}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {a.time}
                      </span>

                      <span
                        className="badge"
                        style={{
                          background: sc.bg,
                          color: sc.color,
                          fontSize: '0.6rem',
                        }}
                      >
                        {sc.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recommended Advocates */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            Recommended Advocates
          </h2>

          <Link
            to="/dashboard/advocates"
            style={{
              fontSize: '0.8rem',
              color: 'var(--blue)',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            Browse all <ArrowRight size={13} />
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
          className="advocates-mini-grid"
        >
          {recommendedAdvocates.map((a) => (
            <div
              key={a.name}
              className="card card-interactive"
              style={{ padding: 20 }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  className="avatar"
                  style={{
                    width: 44,
                    height: 44,
                    background: `linear-gradient(135deg, ${a.color}, ${a.color}88)`,
                  }}
                >
                  {a.initials}
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: 'var(--text)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {a.name}
                  </div>

                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      marginTop: 1,
                    }}
                  >
                    {a.speciality}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 14,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Star
                    size={12}
                    style={{ color: '#F59E0B' }}
                    fill="#F59E0B"
                  />

                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {a.rating}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <MapPin
                    size={12}
                    style={{ color: 'var(--text-muted)' }}
                  />

                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {a.city}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  ₹{a.fee}/hr
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: a.available
                      ? 'var(--emerald)'
                      : 'var(--text-muted)',
                  }}
                >
                  {a.available ? '● Available' : '○ Busy'}
                </span>

                <Link
                  to="/dashboard/booking"
                  className="btn-primary"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    opacity: a.available ? 1 : 0.4,
                    pointerEvents: a.available
                      ? 'auto'
                      : 'none',
                  }}
                >
                  Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Appointment */}
      <div className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--blue-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar
              size={20}
              style={{ color: 'var(--blue)' }}
            />
          </div>

          <div
            style={{
              flex: 1,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: 'var(--text)',
                fontSize: '0.95rem',
              }}
            >
              Upcoming: Consultation with Adv. Kavita Srinivasan
            </div>

            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: 3,
              }}
            >
              Tomorrow, 10 August 2026 · 3:00 PM – 4:00 PM ·
              Video Call · Property Dispute
            </div>
          </div>

          <Link
            to="/dashboard/booking"
            className="btn-primary"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Join Call
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .qa-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .two-col-grid {
            grid-template-columns: 1fr !important;
          }

          .advocates-mini-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .qa-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .advocates-mini-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}