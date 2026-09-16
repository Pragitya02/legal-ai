import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getStoredUser, setStoredUser } from '../lib/auth'
import {
  Calendar,
  Users,
  DollarSign,
  Star,
  Plus,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle,
  MessageSquare,
  Search,
  Scale,
  Briefcase,
} from 'lucide-react'


// =====================================================
// TYPES
// =====================================================

interface User {
  id?: number | string
  fullName?: string
  full_name?: string
  email?: string
  phone?: string
  role?: string
}

interface Appointment {
  id: number | string
  clientName?: string
  client?: string
  date?: string
  time?: string
  type?: string
  status?: string
}

interface DashboardStats {
  appointments: string
  clients: string
  revenue: string
  rating: string
}


// =====================================================
// API
// =====================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'


// =====================================================
// GET USER NAME
// =====================================================

function getUserName(
  user: User | null
) {

  if (!user) {
    return 'User'
  }

  const name =
    user.fullName ||
    user.full_name ||
    'User'

  return String(name)
    .replace(
      /^Adv\.\s*/i,
      ''
    )
    .trim()
}


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AdvocateDashboard() {

  const [
    user,
    setUser
  ] = useState<User | null>(
    getStoredUser()
  )


  const [
    loading,
    setLoading
  ] = useState(true)


  const [
    appointments,
    setAppointments
  ] = useState<
    Appointment[]
  >([])


  const [
    stats,
    setStats
  ] = useState<DashboardStats>({
    appointments: '__',
    clients: '__',
    revenue: '__',
    rating: '__',
  })


  // ===================================================
  // LOAD PROFILE
  // ===================================================

  useEffect(() => {

    const loadProfile =
      async () => {

        try {

          if (!getStoredUser()) {

            setLoading(false)

            return
          }


          const response =
            await fetch(
              `${API_URL}/api/profile`,
              {
                method: 'GET',
                credentials: 'include',

                headers: {
                  'Content-Type':
                    'application/json',
                },
              }
            )


          if (!response.ok) {

            console.error(
              'Profile request failed:',
              response.status
            )

            return
          }


          const data =
            await response.json()


          if (
            data.success &&
            data.user
          ) {

            setUser(
              data.user
            )


            // Keep localStorage
            // synchronized.

            setStoredUser(data.user)
          }

        } catch (error) {

          console.error(
            'PROFILE FETCH ERROR:',
            error
          )

        } finally {

          setLoading(false)
        }
      }


    loadProfile()

  }, [])


  // ===================================================
  // OPTIONAL DASHBOARD DATA
  //
  // We intentionally do NOT create fake data.
  // ===================================================

  useEffect(() => {

    const loadDashboard =
      async () => {

        try {

          if (!getStoredUser()) {
            return
          }


          /*
           * If you later create a real
           * dashboard API, connect it here.
           *
           * Example:
           *
           * GET /api/lawyers/dashboard
           *
           * Until then, all values remain "__".
           */


          setStats({
            appointments: '__',
            clients: '__',
            revenue: '__',
            rating: '__',
          })


          // No fake appointments.

          setAppointments([])

        } catch (error) {

          console.error(
            'DASHBOARD FETCH ERROR:',
            error
          )

        }

      }


    loadDashboard()

  }, [])


  // ===================================================
  // USER DISPLAY
  // ===================================================

  const userName =
    getUserName(user)


  // ===================================================
  // INITIALS
  // ===================================================

  const initials =
    userName
      .split(' ')
      .filter(Boolean)
      .map(
        word =>
          word[0]
      )
      .join('')
      .slice(0, 2)
      .toUpperCase()


  // ===================================================
  // STAT CARDS
  // ===================================================

  const statCards = [

    {
      icon: Calendar,

      value:
        stats.appointments,

      label:
        "Today's Appointments",

      change:
        '',

      color:
        'var(--blue)',
    },

    {
      icon: Users,

      value:
        stats.clients,

      label:
        'Active Clients',

      change:
        '',

      color:
        '#7C3AED',
    },

    {
      icon: DollarSign,

      value:
        stats.revenue,

      label:
        'This Month Revenue',

      change:
        '',

      color:
        'var(--emerald)',
    },

    {
      icon: Star,

      value:
        stats.rating,

      label:
        'Average Rating',

      change:
        '',

      color:
        '#F59E0B',
    },

  ]


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {

    return (

      <div
        style={{
          minHeight:
            '60vh',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          color:
            'var(--text-muted)',
        }}
      >

        Loading dashboard...

      </div>
    )
  }


  // ===================================================
  // RETURN
  // ===================================================

  return (

    <div
      style={{
        width:
          '100%',
      }}
    >


      {/* =================================================
          WELCOME HEADER
      ================================================= */}

      <section
        style={{
          background:
            'linear-gradient(135deg, #8A6508 0%, #C9A227 45%, #F0D264 100%)',

          borderRadius:
            16,

          padding:
            '24px',

          marginBottom:
            20,

          color:
            'white',

          position:
            'relative',

          overflow:
            'hidden',
        }}
      >

        {/* BACKGROUND DECORATION */}

        <div
          style={{
            position:
              'absolute',

            width:
              220,

            height:
              220,

            borderRadius:
              '50%',

            background:
              'rgba(255,255,255,0.08)',

            right:
              -80,

            top:
              -100,
          }}
        />


        <div
          style={{
            position:
              'relative',

            zIndex:
              1,
          }}
        >

          {/* TOP */}

          <div
            style={{
              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'space-between',

              gap:
                20,

              flexWrap:
                'wrap',
            }}
          >

            <div>

              <div
                style={{
                  fontSize:
                    '0.8rem',

                  opacity:
                    0.7,

                  marginBottom:
                    4,
                }}
              >
                Good morning 🌟
              </div>


              <h1
                style={{
                  margin:
                    0,

                  fontSize:
                    '1.5rem',

                  fontWeight:
                    800,

                  letterSpacing:
                    '-0.03em',
                }}
              >

                Adv. {userName}

              </h1>


              <div
                style={{
                  display:
                    'flex',

                  alignItems:
                    'center',

                  gap:
                    8,

                  marginTop:
                    8,
                }}
              >

                <span
                  style={{
                    padding:
                      '3px 10px',

                    borderRadius:
                      99,

                    background:
                      'rgba(255,255,255,0.18)',

                    fontSize:
                      '0.7rem',

                    fontWeight:
                      700,
                  }}
                >

                  ✓ Advocate

                </span>


                <span
                  style={{
                    fontSize:
                      '0.78rem',

                    opacity:
                      0.7,
                  }}
                >

                  NyayaAI Legal Platform

                </span>

              </div>

            </div>


            {/* AI BUTTON */}

            <Link
              to="/advocate/ai-research"

              style={{
                padding:
                  '10px 18px',

                borderRadius:
                  10,

                background:
                  'rgba(255,255,255,0.15)',

                border:
                  '1px solid rgba(255,255,255,0.25)',

                color:
                  'white',

                textDecoration:
                  'none',

                fontSize:
                  '0.875rem',

                fontWeight:
                  600,

                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  6,
              }}
            >

              <Scale
                size={15}
              />

              AI Research Assistant

            </Link>

          </div>


          {/* SMALL STATS */}

          <div
            style={{
              display:
                'flex',

              gap:
                16,

              marginTop:
                20,

              flexWrap:
                'wrap',
            }}
          >

            {statCards.map(
              stat => (

                <div
                  key={
                    stat.label
                  }

                  style={{
                    padding:
                      '10px 14px',

                    borderRadius:
                      10,

                    background:
                      'rgba(255,255,255,0.12)',

                    border:
                      '1px solid rgba(255,255,255,0.15)',

                    minWidth:
                      125,
                  }}
                >

                  <div
                    style={{
                      fontSize:
                        '1.2rem',

                      fontWeight:
                        800,

                      color:
                        'white',
                    }}
                  >
                    {stat.value}
                  </div>


                  <div
                    style={{
                      fontSize:
                        '0.68rem',

                      color:
                        'rgba(255,255,255,0.65)',

                      marginTop:
                        1,
                    }}
                  >
                    {stat.label}
                  </div>

                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(4, 1fr)',

          gap:
            14,

          marginBottom:
            20,
        }}

        className="stats-row"
      >

        {statCards.map(
          stat => {

            const Icon =
              stat.icon

            return (

              <div
                key={
                  stat.label
                }

                className="card"

                style={{
                  padding:
                    18,
                }}
              >

                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    alignItems:
                      'flex-start',

                    marginBottom:
                      12,
                  }}
                >

                  <div
                    style={{
                      width:
                        36,

                      height:
                        36,

                      borderRadius:
                        9,

                      background:
                        `${stat.color}18`,

                      display:
                        'flex',

                      alignItems:
                        'center',

                      justifyContent:
                        'center',
                    }}
                  >

                    <Icon
                      size={17}
                      color={
                        stat.color
                      }
                    />

                  </div>

                </div>


                <div
                  style={{
                    fontSize:
                      '1.4rem',

                    fontWeight:
                      800,

                    color:
                      'var(--text)',

                    marginBottom:
                      3,
                  }}
                >

                  {stat.value}

                </div>


                <div
                  style={{
                    fontSize:
                      '0.72rem',

                    color:
                      'var(--text-muted)',
                  }}
                >

                  {stat.label}

                </div>

              </div>

            )
          }
        )}

      </div>


      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            '2fr 1fr',

          gap:
            20,
        }}

        className="dashboard-main-grid"
      >


        {/* =================================================
            APPOINTMENTS
        ================================================= */}

        <section
          className="card"
          style={{
            padding:
              20,
          }}
        >

          <div
            style={{
              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'center',

              marginBottom:
                18,
            }}
          >

            <div>

              <h2
                style={{
                  margin:
                    0,

                  fontSize:
                    '1rem',

                  fontWeight:
                    700,

                  color:
                    'var(--text)',
                }}
              >

                Today's Appointments

              </h2>


              <p
                style={{
                  margin:
                    '4px 0 0',

                  fontSize:
                    '0.72rem',

                  color:
                    'var(--text-muted)',
                }}
              >

                Your upcoming consultations

              </p>

            </div>


            <Link
              to="/advocate/appointments"

              style={{
                fontSize:
                  '0.75rem',

                color:
                  'var(--blue)',

                textDecoration:
                  'none',

                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  4,

                fontWeight:
                  600,
              }}
            >

              View all

              <ArrowRight
                size={13}
              />

            </Link>

          </div>


          {/* EMPTY STATE */}

          {appointments.length === 0 ? (

            <div
              style={{
                padding:
                  '42px 20px',

                textAlign:
                  'center',

                border:
                  '1px dashed var(--border)',

                borderRadius:
                  12,

                background:
                  'var(--bg-secondary)',
              }}
            >

              <Calendar
                size={30}
                style={{
                  color:
                    'var(--text-subtle)',

                  marginBottom:
                    10,
                }}
              />


              <div
                style={{
                  fontSize:
                    '0.85rem',

                  fontWeight:
                    600,

                  color:
                    'var(--text)',

                  marginBottom:
                    4,
                }}
              >

                No appointments yet

              </div>


              <div
                style={{
                  fontSize:
                    '0.72rem',

                  color:
                    'var(--text-muted)',

                  marginBottom:
                    16,
                }}
              >

                Your real appointments
                will appear here.

              </div>


              <Link
                to="/advocate/appointments"

                className="btn-primary"

                style={{
                  display:
                    'inline-flex',

                  alignItems:
                    'center',

                  gap:
                    6,

                  padding:
                    '8px 14px',

                  borderRadius:
                    8,

                  textDecoration:
                    'none',

                  fontSize:
                    '0.75rem',

                  fontWeight:
                    600,
                }}
              >

                <Plus
                  size={14}
                />

                Add Appointment

              </Link>

            </div>

          ) : (

            <div>

              {appointments.map(
                appointment => (

                  <div
                    key={
                      appointment.id
                    }

                    style={{
                      display:
                        'flex',

                      alignItems:
                        'center',

                      gap:
                        12,

                      padding:
                        '12px 0',

                      borderBottom:
                        '1px solid var(--border)',
                    }}
                  >

                    <div
                      style={{
                        width:
                          36,

                        height:
                          36,

                        borderRadius:
                          10,

                        background:
                          'var(--blue-subtle)',

                        display:
                          'flex',

                        alignItems:
                          'center',

                        justifyContent:
                          'center',
                      }}
                    >

                      <Calendar
                        size={16}
                        color={
                          'var(--blue)'
                        }
                      />

                    </div>


                    <div
                      style={{
                        flex:
                          1,
                      }}
                    >

                      <div
                        style={{
                          fontSize:
                            '0.8rem',

                          fontWeight:
                            600,

                          color:
                            'var(--text)',
                        }}
                      >

                        {
                          appointment.clientName ||
                          appointment.client ||
                          'Client'
                        }

                      </div>


                      <div
                        style={{
                          fontSize:
                            '0.68rem',

                          color:
                            'var(--text-muted)',

                          marginTop:
                            2,
                        }}
                      >

                        {
                          appointment.date ||
                          ''
                        }

                        {' '}

                        {
                          appointment.time ||
                          ''
                        }

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>


        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <section
          className="card"
          style={{
            padding:
              20,
          }}
        >

          <h2
            style={{
              margin:
                '0 0 16px',

              fontSize:
                '1rem',

              fontWeight:
                700,

              color:
                'var(--text)',
            }}
          >

            Quick Actions

          </h2>


          <div
            style={{
              display:
                'flex',

              flexDirection:
                'column',

              gap:
                8,
            }}
          >

            <Link
              to="/advocate/ai-research"

              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  10,

                padding:
                  12,

                borderRadius:
                  9,

                background:
                  'var(--bg-secondary)',

                border:
                  '1px solid var(--border)',

                textDecoration:
                  'none',

                color:
                  'var(--text)',
              }}
            >

              <Scale
                size={17}
                color={
                  'var(--blue)'
                }
              />

              <span
                style={{
                  fontSize:
                    '0.78rem',

                  fontWeight:
                    600,
                }}
              >
                AI Legal Research
              </span>

            </Link>


            <Link
              to="/advocate/clients"

              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  10,

                padding:
                  12,

                borderRadius:
                  9,

                background:
                  'var(--bg-secondary)',

                border:
                  '1px solid var(--border)',

                textDecoration:
                  'none',

                color:
                  'var(--text)',
              }}
            >

              <Users
                size={17}
                color="#7C3AED"
              />

              <span
                style={{
                  fontSize:
                    '0.78rem',

                  fontWeight:
                    600,
                }}
              >
                Manage Clients
              </span>

            </Link>


            <Link
              to="/advocate/documents"

              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  10,

                padding:
                  12,

                borderRadius:
                  9,

                background:
                  'var(--bg-secondary)',

                border:
                  '1px solid var(--border)',

                textDecoration:
                  'none',

                color:
                  'var(--text)',
              }}
            >

              <FileText
                size={17}
                color={
                  'var(--emerald)'
                }
              />

              <span
                style={{
                  fontSize:
                    '0.78rem',

                  fontWeight:
                    600,
                }}
              >
                Documents
              </span>

            </Link>


            <Link
              to="/advocate/appointments"

              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  10,

                padding:
                  12,

                borderRadius:
                  9,

                background:
                  'var(--bg-secondary)',

                border:
                  '1px solid var(--border)',

                textDecoration:
                  'none',

                color:
                  'var(--text)',
              }}
            >

              <Calendar
                size={17}
                color="#F59E0B"
              />

              <span
                style={{
                  fontSize:
                    '0.78rem',

                  fontWeight:
                    600,
                }}
              >
                Appointments
              </span>

            </Link>

          </div>

        </section>

      </div>


      {/* =================================================
          LOWER SECTION
      ================================================= */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            '1fr 1fr',

          gap:
            20,

          marginTop:
            20,
        }}

        className="dashboard-lower-grid"
      >


        {/* =================================================
            REVENUE
        ================================================= */}

        <section
          className="card"
          style={{
            padding:
              20,
          }}
        >

          <div
            style={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                8,

              marginBottom:
                16,
            }}
          >

            <DollarSign
              size={17}
              color={
                'var(--emerald)'
              }
            />

            <h2
              style={{
                margin:
                  0,

                fontSize:
                  '1rem',

                fontWeight:
                  700,

                color:
                  'var(--text)',
              }}
            >

              Revenue Overview

            </h2>

          </div>


          <div
            style={{
              height:
                180,

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              border:
                '1px dashed var(--border)',

              borderRadius:
                12,

              background:
                'var(--bg-secondary)',
            }}
          >

            <div
              style={{
                textAlign:
                  'center',
              }}
            >

              <DollarSign
                size={28}
                style={{
                  color:
                    'var(--text-subtle)',

                  marginBottom:
                    8,
                }}
              />


              <div
                style={{
                  fontSize:
                    '0.85rem',

                  fontWeight:
                    600,

                  color:
                    'var(--text)',
                }}
              >

                No revenue data

              </div>


              <div
                style={{
                  fontSize:
                    '0.7rem',

                  color:
                    'var(--text-muted)',

                  marginTop:
                    4,
                }}
              >

                Revenue will appear
                when transactions are connected.

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            RECENT ACTIVITY
        ================================================= */}

        <section
          className="card"
          style={{
            padding:
              20,
          }}
        >

          <div
            style={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                8,

              marginBottom:
                16,
            }}
          >

            <Clock
              size={17}
              color={
                'var(--blue)'
              }
            />

            <h2
              style={{
                margin:
                  0,

                fontSize:
                  '1rem',

                fontWeight:
                  700,

                color:
                  'var(--text)',
              }}
            >

              Recent Activity

            </h2>

          </div>


          <div
            style={{
              height:
                180,

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              border:
                '1px dashed var(--border)',

              borderRadius:
                12,

              background:
                'var(--bg-secondary)',
            }}
          >

            <div
              style={{
                textAlign:
                  'center',
              }}
            >

              <MessageSquare
                size={28}
                style={{
                  color:
                    'var(--text-subtle)',

                  marginBottom:
                    8,
                }}
              />


              <div
                style={{
                  fontSize:
                    '0.85rem',

                  fontWeight:
                    600,

                  color:
                    'var(--text)',
                }}
              >

                No recent activity

              </div>


              <div
                style={{
                  fontSize:
                    '0.7rem',

                  color:
                    'var(--text-muted)',

                  marginTop:
                    4,
                }}
              >

                Activity from your clients
                will appear here.

              </div>

            </div>

          </div>

        </section>

      </div>


      {/* =================================================
          INFORMATION
      ================================================= */}

      <section
        style={{
          marginTop:
            20,

          padding:
            '14px 16px',

          borderRadius:
            10,

          background:
            'var(--blue-subtle)',

          border:
            '1px solid var(--blue-light)',

          display:
            'flex',

          alignItems:
            'center',

          gap:
            10,
        }}
      >

        <CheckCircle
          size={17}
          color={
            'var(--blue)'
          }
        />

        <div
          style={{
            fontSize:
              '0.72rem',

            color:
              'var(--text-muted)',

            lineHeight:
              1.5,
          }}
        >

          Dashboard statistics are currently
          waiting for real database data.
          No demo appointments, revenue,
          clients, or ratings are being shown.

        </div>

      </section>

    </div>
  )
}