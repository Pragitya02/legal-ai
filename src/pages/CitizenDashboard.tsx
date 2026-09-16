import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isLoggedIn, getStoredUser } from '../lib/auth'
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const quickActions = [
  {
    icon: Plus,
    label: 'Start New Case',
    desc: 'Describe your legal issue',
    href: '/dashboard/new-case',
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
    desc: 'Find verified advocates',
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

interface CaseItem {
  id: number
  user_id: number
  title: string
  description: string
  category: string
  severity: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string
  created_at: string
  updated_at: string
}

interface Advocate {
  id: number
  name: string
  initials: string
  speciality: string
  rating: number
  cases: number
  city: string
  fee: number
  available: boolean
  color: string
}

export default function CitizenDashboard() {
  const [recommendedAdvocates, setRecommendedAdvocates] = useState<
    Advocate[]
  >([])

  const [loadingAdvocates, setLoadingAdvocates] = useState(true)
  const [advocateError, setAdvocateError] = useState('')

  // =========================================================
  // REAL CASES FROM DATABASE
  // =========================================================

  const [cases, setCases] = useState<CaseItem[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [caseError, setCaseError] = useState('')

  // =========================================================
  // REAL AI CONSULTATIONS FROM AI ASSISTANT HISTORY
  // =========================================================

  const [aiConsultations, setAiConsultations] = useState(0)

  // Get logged-in citizen
  const savedUser: any = getStoredUser() || {}

  const userName =
    savedUser.fullName ||
    savedUser.full_name ||
    'User'

  // ==========================================
  // LOAD REAL CASES FROM DATABASE
  // ==========================================

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoadingCases(true)
        setCaseError('')

        if (!isLoggedIn()) {
          setCases([])
          setCaseError('Please login again to load your cases.')
          return
        }

        const response = await fetch(
          `${API_URL}/api/cases`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const result = await response.json()

        console.log('CASES API RESPONSE:', result)

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Failed to load cases'
          )
        }

        setCases(
          Array.isArray(result.cases)
            ? result.cases
            : []
        )
      } catch (error: any) {
        console.error('LOAD CASES ERROR:', error)
        setCases([])
        setCaseError(
          error.message || 'Unable to load cases'
        )
      } finally {
        setLoadingCases(false)
      }
    }

    loadCases()
  }, [])

  // ==========================================
  // LOAD REAL AI CONSULTATIONS
  //
  // Each saved AI Assistant conversation counts
  // as one consultation. This is independent of
  // My Cases.
  // ==========================================

  useEffect(() => {
    const loadAIConsultations = async () => {
      try {
        if (!isLoggedIn()) {
          setAiConsultations(0)
          return
        }

        const response = await fetch(
          `${API_URL}/api/chat/conversations`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              'Failed to load AI consultations'
          )
        }

        setAiConsultations(
          Array.isArray(result.conversations)
            ? result.conversations.length
            : 0
        )
      } catch (error) {
        console.error(
          'LOAD AI CONSULTATIONS ERROR:',
          error
        )

        // Do not show a fake number when the
        // consultation history cannot be loaded.
        setAiConsultations(0)
      }
    }

    loadAIConsultations()
  }, [])

  // ==========================================
  // LOAD ALL REAL ADVOCATES FROM DATABASE
  // ==========================================

  useEffect(() => {
    const loadAdvocates = async () => {
      try {
        setLoadingAdvocates(true)
        setAdvocateError('')

        const response = await fetch(
          `${API_URL}/api/lawyers`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const result = await response.json()

        console.log(
          'LAWYERS API RESPONSE:',
          result
        )

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              'Failed to load advocates'
          )
        }

        const lawyers =
          result.lawyers ||
          result.advocates ||
          []

        const formattedAdvocates: Advocate[] =
          lawyers.map(
            (lawyer: any, index: number) => {
              const realName =
                lawyer.full_name ||
                lawyer.fullName ||
                lawyer.name ||
                'Advocate'

              const initials =
                realName
                  .split(' ')
                  .filter(Boolean)
                  .map(
                    (word: string) =>
                      word[0]
                  )
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

              return {
                id: lawyer.id,

                name: realName.startsWith(
                  'Adv.'
                )
                  ? realName
                  : `Adv. ${realName}`,

                initials,

                speciality:
                  lawyer.speciality ||
                  lawyer.specialization ||
                  lawyer.specialization_name ||
                  'Legal Services',

                rating: Number(
                  lawyer.rating || 0
                ),

                cases: Number(
                  lawyer.cases ||
                    lawyer.total_cases ||
                    0
                ),

                city:
                  lawyer.city ||
                  lawyer.location ||
                  'India',

                fee: Number(
                  lawyer.fee ||
                    lawyer.consultation_fee ||
                    0
                ),

                available:
                  lawyer.available !== false,

                color:
                  index % 2 === 0
                    ? '#2563EB'
                    : '#7C3AED',
              }
            }
          )

        // IMPORTANT:
        // Show ALL registered advocates.
        setRecommendedAdvocates(
          formattedAdvocates
        )
      } catch (error: any) {
        console.error(
          'LOAD ADVOCATES ERROR:',
          error
        )

        setAdvocateError(
          error.message ||
            'Unable to load advocates'
        )

        setRecommendedAdvocates([])
      } finally {
        setLoadingAdvocates(false)
      }
    }

    loadAdvocates()
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
      className="page-enter"
    >

      {/* ==========================================
          WELCOME
      ========================================== */}

      <div
        style={{
          borderRadius: 'var(--radius)',
          padding: '28px 32px',
          background:
            'linear-gradient(135deg, #8A6508 0%, #C9A227 45%, #F0D264 100%)',
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
                {cases.filter(
                  (c) =>
                    c.status === 'open' ||
                    c.status === 'in_progress'
                ).length}{' '}
                active case
                {cases.filter(
                  (c) =>
                    c.status === 'open' ||
                    c.status === 'in_progress'
                ).length === 1
                  ? ''
                  : 's'}
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
              background:
                'rgba(255,255,255,0.15)',
              border:
                '1px solid rgba(255,255,255,0.25)',
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

        {/* MINI STATS */}

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
              val: String(cases.length),
              lbl: 'Total Cases',
            },
            {
              val: String(
                cases.filter(
                  (c) =>
                    c.status === 'open' ||
                    c.status === 'in_progress'
                ).length
              ),
              lbl: 'Active',
            },
            {
              val: String(aiConsultations),
              lbl: 'AI Consultations',
            },
            {
              val: '2',
              lbl: 'Documents',
            },
          ].map((s) => (
            <div
              key={s.lbl}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                background:
                  'rgba(255,255,255,0.1)',
                border:
                  '1px solid rgba(255,255,255,0.15)',
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
                  color:
                    'rgba(255,255,255,0.6)',
                  marginTop: 1,
                }}
              >
                {s.lbl}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==========================================
          QUICK ACTIONS
      ========================================== */}

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
            gridTemplateColumns:
              'repeat(4, 1fr)',
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
                  style={{
                    color: a.color,
                  }}
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

      {/* ==========================================
          CASES + ACTIVITY
      ========================================== */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 1fr',
          gap: 20,
        }}
        className="two-col-grid"
      >

        {/* MY CASES */}

        <div
          className="card"
          style={{ padding: 24 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
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
              View all
              <ArrowRight size={13} />
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {loadingCases && (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                }}
              >
                Loading your cases...
              </div>
            )}

            {!loadingCases && caseError && (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                }}
              >
                {caseError}
              </div>
            )}

            {!loadingCases &&
              !caseError &&
              cases.length === 0 && (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  No cases yet. Start a new case from My Cases.
                </div>
              )}

            {!loadingCases &&
              !caseError &&
              cases.slice(0, 3).map((c) => {
                const isResolved =
                  c.status === 'resolved' ||
                  c.status === 'closed'

                const statusLabel = isResolved
                  ? 'Closed'
                  : 'Processing'

                return (
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
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
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
                          Case #{c.id} · {c.category}
                        </div>
                      </div>

                      <span
                        className="badge"
                        style={{
                          background: isResolved
                            ? 'rgba(120,120,120,0.1)'
                            : 'rgba(245,158,11,0.1)',
                          color: isResolved
                            ? 'var(--text-muted)'
                            : '#F59E0B',
                          flexShrink: 0,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* RECENT ACTIVITY */}

        <div
          className="card"
          style={{ padding: 24 }}
        >
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
              style={{
                color:
                  'var(--text-muted)',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {recentActivity.map(
              (a, i) => {
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
                      position:
                        'relative',
                    }}
                  >
                    {i <
                      recentActivity.length -
                        1 && (
                      <div
                        style={{
                          position:
                            'absolute',
                          left: 12,
                          top: 28,
                          bottom: 0,
                          width: 1,
                          background:
                            'var(--border)',
                        }}
                      />
                    )}

                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius:
                          '50%',
                        flexShrink: 0,
                        background:
                          `color-mix(in srgb, ${a.color} 12%, transparent)`,
                        display: 'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        position:
                          'relative',
                        zIndex: 1,
                      }}
                    >
                      <a.icon
                        size={12}
                        style={{
                          color: a.color,
                        }}
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
                          fontSize:
                            '0.8rem',
                          fontWeight: 500,
                          color:
                            'var(--text)',
                          lineHeight: 1.4,
                        }}
                      >
                        {a.title}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 8,
                          marginTop: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              '0.7rem',
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          {a.time}
                        </span>

                        <span
                          className="badge"
                          style={{
                            background:
                              sc.bg,
                            color:
                              sc.color,
                            fontSize:
                              '0.6rem',
                          }}
                        >
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          ALL REGISTERED ADVOCATES
      ========================================== */}

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
            Browse all
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* LOADING */}

        {loadingAdvocates && (
          <div
            className="card"
            style={{
              padding: 30,
              textAlign: 'center',
              color:
                'var(--text-muted)',
            }}
          >
            Loading advocates...
          </div>
        )}

        {/* ERROR */}

        {!loadingAdvocates &&
          advocateError && (
            <div
              className="card"
              style={{
                padding: 30,
                textAlign: 'center',
                color: '#DC2626',
              }}
            >
              {advocateError}
            </div>
          )}

        {/* NO ADVOCATES */}

        {!loadingAdvocates &&
          !advocateError &&
          recommendedAdvocates.length ===
            0 && (
            <div
              className="card"
              style={{
                padding: 30,
                textAlign: 'center',
                color:
                  'var(--text-muted)',
              }}
            >
              No advocates have
              registered yet.
            </div>
          )}

        {/* ALL REAL ADVOCATES */}

        {!loadingAdvocates &&
          recommendedAdvocates.length >
            0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(3, 1fr)',
                gap: 16,
              }}
              className="advocates-mini-grid"
            >
              {recommendedAdvocates.map(
                (a) => (
                  <div
                    key={a.id}
                    className="card card-interactive"
                    style={{
                      padding: 20,
                    }}
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
                          background:
                            `linear-gradient(135deg, ${a.color}, ${a.color}88)`,
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
                            color:
                              'var(--text)',
                            fontSize:
                              '0.875rem',
                          }}
                        >
                          {a.name}
                        </div>

                        <div
                          style={{
                            fontSize:
                              '0.72rem',
                            color:
                              'var(--text-muted)',
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
                        flexWrap:
                          'wrap',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 3,
                        }}
                      >
                        <Star
                          size={12}
                          style={{
                            color:
                              '#F59E0B',
                          }}
                          fill="#F59E0B"
                        />

                        <span
                          style={{
                            fontSize:
                              '0.78rem',
                            fontWeight: 600,
                            color:
                              'var(--text)',
                          }}
                        >
                          {a.rating ||
                            'New'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 3,
                        }}
                      >
                        <MapPin
                          size={12}
                          style={{
                            color:
                              'var(--text-muted)',
                          }}
                        />

                        <span
                          style={{
                            fontSize:
                              '0.72rem',
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          {a.city}
                        </span>
                      </div>

                      {a.fee > 0 && (
                        <div
                          style={{
                            fontSize:
                              '0.72rem',
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          ₹{a.fee}/hr
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            '0.7rem',
                          fontWeight: 600,
                          color:
                            a.available
                              ? 'var(--emerald)'
                              : 'var(--text-muted)',
                        }}
                      >
                        {a.available
                          ? '● Available'
                          : '○ Busy'}
                      </span>

                      <Link
                        to={`/dashboard/booking?advocateId=${a.id}`}
                        className="btn-primary"
                        style={{
                          padding:
                            '6px 12px',
                          borderRadius: 8,
                          fontSize:
                            '0.75rem',
                          fontWeight: 600,
                          textDecoration:
                            'none',
                          opacity:
                            a.available
                              ? 1
                              : 0.4,
                          pointerEvents:
                            a.available
                              ? 'auto'
                              : 'none',
                        }}
                      >
                        Book
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
      </div>

      {/* ==========================================
          UPCOMING APPOINTMENT
      ========================================== */}

      <div
        className="card"
        style={{ padding: 24 }}
      >
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
              background:
                'var(--blue-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar
              size={20}
              style={{
                color: 'var(--blue)',
              }}
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
              Upcoming Appointment
            </div>

            <div
              style={{
                fontSize: '0.8rem',
                color:
                  'var(--text-muted)',
                marginTop: 3,
              }}
            >
              Your upcoming advocate
              consultation will appear
              here.
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
            Book Consultation
          </Link>
        </div>
      </div>

      {/* ==========================================
          RESPONSIVE
      ========================================== */}

      <style>{`
        @media (max-width: 900px) {
          .qa-grid {
            grid-template-columns:
              repeat(2, 1fr) !important;
          }

          .two-col-grid {
            grid-template-columns:
              1fr !important;
          }

          .advocates-mini-grid {
            grid-template-columns:
              1fr 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .qa-grid {
            grid-template-columns:
              1fr 1fr !important;
          }

          .advocates-mini-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </div>
  )
}