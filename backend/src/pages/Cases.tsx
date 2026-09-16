import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Plus,
  Search,
  FolderOpen,
  RefreshCw,
} from 'lucide-react'

interface CaseItem {
  id: number | string
  title: string
  type: string
  status: 'Active' | 'Pending' | 'Resolved'
  progress: number
  updated: string
}

const API_BASE = 'https://legal-ai-z7vb.onrender.com'

const statusColor: Record<
  string,
  {
    c: string
    bg: string
  }
> = {
  Active: {
    c: 'var(--blue)',
    bg: 'var(--blue-subtle)',
  },

  Pending: {
    c: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
  },

  Resolved: {
    c: 'var(--emerald)',
    bg: 'var(--emerald-subtle)',
  },
}

/* =========================================================
   TOKEN
========================================================= */

function getToken(): string | null {
  return localStorage.getItem('token')
}

/* =========================================================
   STATUS
========================================================= */

function normalizeStatus(
  status: any
): 'Active' | 'Pending' | 'Resolved' {
  const value = String(
    status || 'open'
  ).toLowerCase()

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

/* =========================================================
   PROGRESS
========================================================= */

function getProgress(status: any): number {
  const value = String(
    status || 'open'
  ).toLowerCase()

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

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  date: any
): string {
  if (!date) {
    return 'Recently'
  }

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return 'Recently'
  }

  return parsed.toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )
}

/* =========================================================
   NORMALIZE CASE
========================================================= */

function normalizeCase(
  item: any,
  index: number
): CaseItem {
  const status =
    normalizeStatus(
      item.status ||
        item.case_status
    )

  const progress =
    typeof item.progress === 'number'
      ? item.progress
      : getProgress(
          item.status ||
            item.case_status
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

    progress,

    updated: formatDate(
      item.updated_at ||
        item.updatedAt ||
        item.created_at ||
        item.createdAt
    ),
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Cases() {
  const [allCases, setAllCases] =
    useState<CaseItem[]>([])

  const [filter, setFilter] =
    useState<
      'All' |
      'Active' |
      'Pending' |
      'Resolved'
    >('All')

  const [search, setSearch] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  /* =======================================================
     LOAD USER CASES
  ======================================================= */

  const loadCases = async () => {
    try {
      setLoading(true)
      setError('')

      const token = getToken()

      console.log(
        '================================'
      )

      console.log(
        'LOADING USER CASES'
      )

      console.log(
        'TOKEN:',
        token
          ? 'FOUND'
          : 'NOT FOUND'
      )

      console.log(
        'URL:',
        `${API_BASE}/api/cases`
      )

      console.log(
        '================================'
      )

      /* ---------------------------------------------------
         NO TOKEN
      --------------------------------------------------- */

      if (!token) {
        setAllCases([])

        setError(
          'You are not logged in. Please login again.'
        )

        return
      }

      /* ---------------------------------------------------
         REQUEST
      --------------------------------------------------- */

      const response =
        await fetch(
          `${API_BASE}/api/cases`,
          {
            method: 'GET',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },
          }
        )

      console.log(
        'CASES STATUS:',
        response.status
      )

      /* ---------------------------------------------------
         RESPONSE
      --------------------------------------------------- */

      const result =
        await response.json()

      console.log(
        'CASES RESPONSE:',
        result
      )

      /* ---------------------------------------------------
         HTTP ERROR
      --------------------------------------------------- */

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `Server error: ${response.status}`
        )
      }

      /* ---------------------------------------------------
         BACKEND SUCCESS FALSE
      --------------------------------------------------- */

      if (
        result &&
        result.success === false
      ) {
        throw new Error(
          result.message ||
            'Failed to load cases'
        )
      }

      /* ---------------------------------------------------
         ACCEPT DIFFERENT RESPONSE FORMATS
      --------------------------------------------------- */

      let cases: any[] = []

      if (
        Array.isArray(result)
      ) {
        cases = result
      }

      else if (
        Array.isArray(
          result?.cases
        )
      ) {
        cases = result.cases
      }

      else if (
        Array.isArray(
          result?.data
        )
      ) {
        cases = result.data
      }

      else if (
        Array.isArray(
          result?.rows
        )
      ) {
        cases = result.rows
      }

      console.log(
        'DATABASE CASES:',
        cases
      )

      console.log(
        'CASE COUNT:',
        cases.length
      )

      /* ---------------------------------------------------
         IMPORTANT

         There is NO hardcoded/default case list here.

         Whatever backend returns is what is displayed.
      --------------------------------------------------- */

      const formattedCases =
        cases.map(
          (
            item: any,
            index: number
          ) =>
            normalizeCase(
              item,
              index
            )
        )

      setAllCases(
        formattedCases
      )

    } catch (err: any) {
      console.error(
        'LOAD CASES ERROR:',
        err
      )

      setAllCases([])

      setError(
        err?.message ||
          'Unable to load cases'
      )

    } finally {
      setLoading(false)
    }
  }

  /* =======================================================
     LOAD ON PAGE OPEN
  ======================================================= */

  useEffect(() => {
    loadCases()
  }, [])

  /* =======================================================
     FILTER
  ======================================================= */

  const filtered =
    allCases.filter(
      (c) => {
        const matchesFilter =
          filter === 'All' ||
          c.status === filter

        const searchValue =
          search
            .trim()
            .toLowerCase()

        const matchesSearch =
          !searchValue ||
          c.title
            .toLowerCase()
            .includes(
              searchValue
            ) ||
          String(c.id)
            .toLowerCase()
            .includes(
              searchValue
            ) ||
          c.type
            .toLowerCase()
            .includes(
              searchValue
            )

        return (
          matchesFilter &&
          matchesSearch
        )
      }
    )

  /* =======================================================
     ACTIVE COUNT
  ======================================================= */

  const activeCount =
    allCases.filter(
      (c) =>
        c.status === 'Active'
    ).length

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="page-enter">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
        }}
      >

        <div>

          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing:
                '-0.03em',
            }}
          >
            My Cases
          </h1>

          <p
            style={{
              color:
                'var(--text-muted)',
              fontSize: '0.9rem',
              marginTop: 2,
            }}
          >
            {allCases.length} cases
            tracked ·{' '}
            {activeCount} active
          </p>

        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
          }}
        >

          {/* REFRESH */}

          <button
            onClick={loadCases}
            disabled={loading}
            title="Refresh cases"
            style={{
              padding:
                '9px 12px',
              borderRadius: 9,
              border:
                '1px solid var(--border)',
              background:
                'var(--bg-secondary)',
              color:
                'var(--text)',
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
              display: 'flex',
              alignItems:
                'center',
              gap: 6,
            }}
          >

            <RefreshCw
              size={15}
              style={{
                animation: loading
                  ? 'spin 1s linear infinite'
                  : 'none',
              }}
            />

            Refresh

          </button>

          {/* START NEW CASE */}

          <Link
            to="/dashboard/ai-assistant"
            className="btn-primary"
            style={{
              padding:
                '9px 16px',
              borderRadius: 9,
              fontSize:
                '0.85rem',
              fontWeight: 600,
              textDecoration:
                'none',
              display: 'flex',
              alignItems:
                'center',
              gap: 6,
            }}
          >

            <Plus size={15} />

            Start New Case

          </Link>

        </div>

      </div>

      {/* ===================================================
          SEARCH + FILTER
      =================================================== */}

      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 18,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems:
            'center',
        }}
      >

        {/* SEARCH */}

        <div
          style={{
            flex: 1,
            minWidth: 200,
            position: 'relative',
          }}
        >

          <Search
            size={14}
            style={{
              position:
                'absolute',
              left: 10,
              top: '50%',
              transform:
                'translateY(-50%)',
              color:
                'var(--text-muted)',
            }}
          />

          <input
            className="input"
            placeholder="Search cases..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            style={{
              paddingLeft: 30,
            }}
          />

        </div>

        {/* FILTER */}

        <div
          style={{
            display: 'flex',
            gap: 6,
          }}
        >

          {(
            [
              'All',
              'Active',
              'Pending',
              'Resolved',
            ] as const
          ).map((f) => (

            <button
              key={f}
              onClick={() =>
                setFilter(f)
              }
              style={{
                padding:
                  '7px 13px',
                borderRadius: 8,
                fontSize:
                  '0.8rem',
                fontWeight: 600,
                cursor:
                  'pointer',
                border:
                  '1px solid var(--border)',
                background:
                  filter === f
                    ? 'var(--blue)'
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

      </div>

      {/* ===================================================
          LOADING
      =================================================== */}

      {loading && (

        <div
          className="card"
          style={{
            padding: 60,
            textAlign:
              'center',
            color:
              'var(--text-muted)',
          }}
        >

          Loading your cases...

        </div>

      )}

      {/* ===================================================
          ERROR
      =================================================== */}

      {!loading &&
        error && (

          <div
            className="card"
            style={{
              padding: 30,
              textAlign:
                'center',
              color: '#DC2626',
            }}
          >

            <div
              style={{
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Failed to load cases
            </div>

            <div
              style={{
                fontSize:
                  '0.85rem',
                marginBottom: 12,
              }}
            >
              {error}
            </div>

            <button
              onClick={loadCases}
              style={{
                padding:
                  '8px 14px',
                borderRadius: 8,
                border:
                  '1px solid var(--border)',
                background:
                  'var(--bg-secondary)',
                cursor:
                  'pointer',
                fontWeight: 600,
              }}
            >
              Try Again
            </button>

          </div>

        )}

      {/* ===================================================
          CASE LIST
      =================================================== */}

      {!loading &&
        !error && (

          <div
            style={{
              display: 'flex',
              flexDirection:
                'column',
              gap: 12,
            }}
          >

            {filtered.map(
              (c) => {

                const sc =
                  statusColor[
                    c.status
                  ] ||
                  statusColor.Pending

                return (

                  <div
                    key={c.id}
                    className="card card-interactive"
                    style={{
                      padding: 18,
                      cursor:
                        'pointer',
                    }}
                  >

                    {/* HEADER */}

                    <div
                      style={{
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'flex-start',
                        gap: 12,
                        marginBottom:
                          10,
                        flexWrap:
                          'wrap',
                      }}
                    >

                      <div>

                        <div
                          style={{
                            fontWeight:
                              700,
                            color:
                              'var(--text)',
                            fontSize:
                              '0.95rem',
                          }}
                        >
                          {c.title}
                        </div>

                        <div
                          style={{
                            fontSize:
                              '0.75rem',
                            color:
                              'var(--text-muted)',
                            marginTop: 3,
                          }}
                        >
                          #{c.id} ·{' '}
                          {c.type} ·
                          Updated{' '}
                          {c.updated}
                        </div>

                      </div>

                      {/* STATUS */}

                      <span
                        className="badge"
                        style={{
                          background:
                            sc.bg,
                          color:
                            sc.c,
                        }}
                      >
                        {c.status}
                      </span>

                    </div>

                    {/* PROGRESS */}

                    <div
                      style={{
                        height: 5,
                        borderRadius: 3,
                        background:
                          'var(--border)',
                        overflow:
                          'hidden',
                      }}
                    >

                      <div
                        style={{
                          height:
                            '100%',
                          width:
                            `${Math.min(
                              Math.max(
                                c.progress,
                                0
                              ),
                              100
                            )}%`,
                          borderRadius: 3,
                          background:
                            sc.c,
                          transition:
                            'width 0.5s ease',
                        }}
                      />

                    </div>

                    <div
                      style={{
                        fontSize:
                          '0.7rem',
                        color:
                          'var(--text-subtle)',
                        marginTop: 4,
                      }}
                    >
                      {c.progress}%
                      complete
                    </div>

                  </div>

                )
              }
            )}

            {/* =================================================
                NO CASES
            ================================================= */}

            {filtered.length ===
              0 && (

              <div
                className="card"
                style={{
                  padding:
                    '60px 20px',
                  textAlign:
                    'center',
                }}
              >

                <FolderOpen
                  size={32}
                  style={{
                    color:
                      'var(--text-subtle)',
                    marginBottom:
                      10,
                  }}
                />

                <div
                  style={{
                    fontWeight: 700,
                    color:
                      'var(--text)',
                    marginBottom:
                      4,
                  }}
                >
                  {allCases.length ===
                  0
                    ? 'No cases yet'
                    : 'No matching cases'}
                </div>

                <div
                  style={{
                    color:
                      'var(--text-muted)',
                    fontSize:
                      '0.85rem',
                  }}
                >
                  {allCases.length ===
                  0
                    ? 'Start a new case using the AI Legal Assistant.'
                    : 'Try a different filter or search term.'}
                </div>

                {/* START CASE */}

                {allCases.length ===
                  0 && (

                  <Link
                    to="/dashboard/ai-assistant"
                    className="btn-primary"
                    style={{
                      display:
                        'inline-flex',
                      alignItems:
                        'center',
                      gap: 6,
                      marginTop: 16,
                      padding:
                        '9px 16px',
                      borderRadius: 9,
                      textDecoration:
                        'none',
                      fontSize:
                        '0.85rem',
                      fontWeight: 600,
                    }}
                  >

                    <Plus size={15} />

                    Start New Case

                  </Link>

                )}

              </div>

            )}

          </div>

        )}

      {/* ===================================================
          SPINNER
      =================================================== */}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

    </div>
  )
}