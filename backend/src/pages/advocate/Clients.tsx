import { useEffect, useState } from 'react'
import { Search, MessageSquare, Calendar, Users } from 'lucide-react'

const API_URL = 'https://legal-ai-z7vb.onrender.com'


// =====================================================
// TYPES
// =====================================================

interface Client {
  id: number | string
  name: string
  initials: string
  case: string
  status: string
  lastContact: string
  color: string
}


// =====================================================
// STATUS COLORS
// =====================================================

const statusColor: Record<
  string,
  { c: string; bg: string }
> = {
  Active: {
    c: 'var(--blue)',
    bg: 'var(--blue-subtle)',
  },

  'In Progress': {
    c: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
  },

  Resolved: {
    c: 'var(--emerald)',
    bg: 'var(--emerald-subtle)',
  },
}


// =====================================================
// COLORS FOR REAL CLIENTS
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
// GET TOKEN
// =====================================================

function getToken() {
  return localStorage.getItem('token') || ''
}


// =====================================================
// CREATE INITIALS
// =====================================================

function getInitials(name: string) {

  if (!name) {
    return 'CL'
  }

  const parts =
    name
      .trim()
      .split(/\s+/)

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase()
}


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Clients() {

  const [search, setSearch] =
    useState('')

  const [clients, setClients] =
    useState<Client[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')


  // ===================================================
  // LOAD REAL CLIENTS
  // ===================================================

  useEffect(() => {

    async function loadClients() {

      try {

        setLoading(true)
        setError('')

        const token =
          getToken()


        if (!token) {

          setError(
            'Authentication token not found.'
          )

          setLoading(false)

          return
        }


        /*
         * IMPORTANT
         *
         * This page does NOT contain fake clients.
         *
         * The backend endpoint below must return
         * the advocate's real clients.
         *
         * Expected response:
         *
         * {
         *   success: true,
         *   clients: [...]
         * }
         */

        const response =
          await fetch(
            `${API_URL}/api/lawyers/clients`,
            {
              method: 'GET',

              headers: {
                Authorization:
                  `Bearer ${token}`,

                'Content-Type':
                  'application/json',
              },
            }
          )


        if (!response.ok) {

          throw new Error(
            `Failed to fetch clients (${response.status})`
          )
        }


        const data =
          await response.json()


        if (
          !data ||
          data.success !== true
        ) {

          throw new Error(
            data?.message ||
            'Unable to fetch clients'
          )
        }


        // ---------------------------------------------
        // MAP REAL DATABASE DATA
        // ---------------------------------------------

        const realClients =
          Array.isArray(data.clients)
            ? data.clients
            : []


        const formattedClients =
          realClients.map(
            (
              client: any,
              index: number
            ) => {

              const name =
                client.name ||
                client.fullName ||
                client.full_name ||
                'Client'


              return {

                id:
                  client.id,

                name,

                initials:
                  getInitials(name),

                case:
                  client.case ||
                  client.caseName ||
                  client.case_name ||
                  'No case information',

                status:
                  client.status ||
                  'Active',

                lastContact:
                  client.lastContact ||
                  client.last_contact ||
                  'No contact data',

                color:
                  avatarColors[
                    index %
                    avatarColors.length
                  ],

              }

            }
          )


        setClients(
          formattedClients
        )


      } catch (err: any) {

        console.error(
          'CLIENTS ERROR:',
          err
        )

        setClients([])

        setError(
          err?.message ||
          'Unable to fetch clients'
        )

      } finally {

        setLoading(false)

      }

    }


    loadClients()

  }, [])


  // ===================================================
  // SEARCH
  // ===================================================

  const filtered =
    clients.filter(
      (client) => {

        if (!search) {
          return true
        }

        const query =
          search.toLowerCase()

        return (
          client.name
            .toLowerCase()
            .includes(query) ||

          client.case
            .toLowerCase()
            .includes(query)
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
          padding:
            '40px 0',

          textAlign:
            'center',

          color:
            'var(--text-muted)',
        }}
      >

        Loading clients...

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
            fontSize:
              '1.4rem',

            fontWeight:
              800,

            color:
              'var(--text)',

            letterSpacing:
              '-0.03em',
          }}
        >

          Clients

        </h1>


        <p
          style={{
            color:
              'var(--text-muted)',

            fontSize:
              '0.9rem',

            marginTop:
              2,
          }}
        >

          {clients.length} real client
          {clients.length === 1 ? '' : 's'}

        </p>

      </div>


      {/* =================================================
          SEARCH
      ================================================= */}

      <div
        style={{
          position:
            'relative',

          maxWidth:
            340,

          marginBottom:
            20,
        }}
      >

        <Search
          size={14}

          style={{
            position:
              'absolute',

            left:
              10,

            top:
              '50%',

            transform:
              'translateY(-50%)',

            color:
              'var(--text-muted)',
          }}
        />


        <input
          className="input"

          placeholder=
            "Search clients or cases..."

          value={
            search
          }

          onChange={
            (e) =>
              setSearch(
                e.target.value
              )
          }

          style={{
            paddingLeft:
              30,
          }}
        />

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div
          style={{
            marginBottom:
              20,

            padding:
              '12px 14px',

            borderRadius:
              9,

            background:
              'rgba(239,68,68,0.08)',

            border:
              '1px solid rgba(239,68,68,0.2)',

            color:
              '#EF4444',

            fontSize:
              '0.8rem',
          }}
        >

          {error}

        </div>

      )}


      {/* =================================================
          NO REAL CLIENTS
      ================================================= */}

      {clients.length === 0 ? (

        <div
          className="card"

          style={{
            padding:
              '60px 20px',

            textAlign:
              'center',
          }}
        >

          <div
            style={{
              width:
                52,

              height:
                52,

              borderRadius:
                14,

              background:
                'var(--blue-subtle)',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              margin:
                '0 auto 14px',
            }}
          >

            <Users
              size={24}
              color="var(--blue)"
            />

          </div>


          <div
            style={{
              fontSize:
                '0.95rem',

              fontWeight:
                700,

              color:
                'var(--text)',

              marginBottom:
                5,
            }}
          >

            No real clients yet

          </div>


          <div
            style={{
              fontSize:
                '0.75rem',

              color:
                'var(--text-muted)',

              maxWidth:
                420,

              margin:
                '0 auto',

              lineHeight:
                1.5,
            }}
          >

            Clients will appear here when
            real client data is available
            in the database.

          </div>

        </div>

      ) : filtered.length === 0 ? (

        /* =================================================
           NO SEARCH RESULTS
        ================================================= */

        <div
          className="card"

          style={{
            padding:
              40,

            textAlign:
              'center',

            color:
              'var(--text-muted)',

            fontSize:
              '0.8rem',
          }}
        >

          No clients found for
          "{search}"

        </div>

      ) : (

        /* =================================================
           CLIENT GRID
        ================================================= */

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(3, 1fr)',

            gap:
              16,
          }}

          className="clients-full-grid"
        >

          {filtered.map(
            (client) => {

              const sc =
                statusColor[
                  client.status
                ] || {
                  c:
                    'var(--blue)',

                  bg:
                    'var(--blue-subtle)',
                }


              return (

                <div
                  key={
                    client.id
                  }

                  className=
                    "card card-interactive"

                  style={{
                    padding:
                      18,
                  }}
                >

                  {/* CLIENT HEADER */}

                  <div
                    style={{
                      display:
                        'flex',

                      gap:
                        12,

                      marginBottom:
                        12,
                    }}
                  >

                    <div
                      className="avatar"

                      style={{
                        width:
                          42,

                        height:
                          42,

                        fontSize:
                          '0.85rem',

                        background:
                          `linear-gradient(
                            135deg,
                            ${client.color},
                            ${client.color}88
                          )`,
                      }}
                    >

                      {
                        client.initials
                      }

                    </div>


                    <div
                      style={{
                        flex:
                          1,

                        minWidth:
                          0,
                      }}
                    >

                      <div
                        style={{
                          fontWeight:
                            700,

                          color:
                            'var(--text)',

                          fontSize:
                            '0.88rem',
                        }}
                      >

                        {
                          client.name
                        }

                      </div>


                      <div
                        style={{
                          fontSize:
                            '0.72rem',

                          color:
                            'var(--text-muted)',

                          marginTop:
                            1,
                        }}
                      >

                        {
                          client.lastContact
                        }

                      </div>

                    </div>

                  </div>


                  {/* CASE */}

                  <div
                    style={{
                      fontSize:
                        '0.8rem',

                      color:
                        'var(--text-muted)',

                      marginBottom:
                        12,

                      lineHeight:
                        1.4,
                    }}
                  >

                    {
                      client.case
                    }

                  </div>


                  {/* FOOTER */}

                  <div
                    style={{
                      display:
                        'flex',

                      justifyContent:
                        'space-between',

                      alignItems:
                        'center',
                    }}
                  >

                    <span
                      className="badge"

                      style={{
                        background:
                          sc.bg,

                        color:
                          sc.c,
                      }}
                    >

                      {
                        client.status
                      }

                    </span>


                    <div
                      style={{
                        display:
                          'flex',

                        gap:
                          6,
                      }}
                    >

                      {/* MESSAGE */}

                      <button
                        title="Message"

                        style={{
                          width:
                            28,

                          height:
                            28,

                          borderRadius:
                            7,

                          border:
                            '1px solid var(--border)',

                          background:
                            'var(--bg-secondary)',

                          color:
                            'var(--text-muted)',

                          cursor:
                            'pointer',

                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'center',
                        }}
                      >

                        <MessageSquare
                          size={13}
                        />

                      </button>


                      {/* SCHEDULE */}

                      <button
                        title="Schedule"

                        style={{
                          width:
                            28,

                          height:
                            28,

                          borderRadius:
                            7,

                          border:
                            '1px solid var(--border)',

                          background:
                            'var(--bg-secondary)',

                          color:
                            'var(--text-muted)',

                          cursor:
                            'pointer',

                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'center',
                        }}
                      >

                        <Calendar
                          size={13}
                        />

                      </button>

                    </div>

                  </div>

                </div>

              )

            }
          )}

        </div>

      )}


      {/* =================================================
          RESPONSIVE
      ================================================= */}

      <style>{`

        @media (max-width: 900px) {

          .clients-full-grid {

            grid-template-columns:
              1fr 1fr !important;

          }

        }


        @media (max-width: 600px) {

          .clients-full-grid {

            grid-template-columns:
              1fr !important;

          }

        }

      `}</style>

    </div>

  )
}