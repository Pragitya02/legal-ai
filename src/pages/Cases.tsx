import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Plus,
  Search,
  FolderOpen,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react'

type CaseStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

interface CaseItem {
  id: number
  user_id: number
  title: string
  description: string
  category: string
  severity: string
  status: CaseStatus
  created_at: string
  updated_at: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const statusColor: Record<
  string,
  { c: string; bg: string; label: string }
> = {
  open: {
    c: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    label: 'Processing',
  },

  in_progress: {
    c: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    label: 'Processing',
  },

  resolved: {
    c: 'var(--text-muted)',
    bg: 'rgba(120,120,120,0.1)',
    label: 'Closed',
  },

  closed: {
    c: 'var(--text-muted)',
    bg: 'rgba(120,120,120,0.1)',
    label: 'Closed',
  },
}

export default function Cases() {
  const navigate = useNavigate()

  const [cases, setCases] = useState<CaseItem[]>([])

  const [filter, setFilter] = useState<
    'All' | 'Processing' | 'Closed'
  >('All')

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // =========================================================
  // LOAD CASES FROM DATABASE
  // =========================================================

  const loadCases = async () => {
    try {
      setLoading(true)

      const response = await fetch(
        `${API_BASE}/api/cases`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )

      const data = await response.json()

      console.log('CASES API RESPONSE:', data)

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to load cases'
        )
      }

      setCases(
        Array.isArray(data.cases)
          ? data.cases
          : []
      )
    } catch (error) {
      console.error(
        'LOAD CASES ERROR:',
        error
      )

      setCases([])
    } finally {
      setLoading(false)
    }
  }

  // =========================================================
  // LOAD CASES WHEN PAGE OPENS
  // =========================================================

  useEffect(() => {
    loadCases()
  }, [])

  // =========================================================
  // DELETE CASE
  // =========================================================

  const deleteCase = async (
    caseId: number
  ) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this case?'
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(caseId)

      const response = await fetch(
        `${API_BASE}/api/cases/${caseId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Failed to delete case'
        )
      }

      // Remove immediately from UI
      setCases(prev =>
        prev.filter(
          c => c.id !== caseId
        )
      )
    } catch (error) {
      console.error(
        'DELETE CASE ERROR:',
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : 'Failed to delete case'
      )
    } finally {
      setDeletingId(null)
    }
  }

  // =========================================================
  // FILTER + SEARCH
  // =========================================================

  const filteredCases =
    cases.filter(caseItem => {
      let matchesFilter = true

      if (filter === 'Processing') {
        matchesFilter =
          caseItem.status === 'open' ||
          caseItem.status === 'in_progress'
      }

      if (filter === 'Closed') {
        matchesFilter =
          caseItem.status === 'resolved' ||
          caseItem.status === 'closed'
      }

      const searchText =
        search.toLowerCase().trim()

      const matchesSearch =
        !searchText ||
        caseItem.title
          .toLowerCase()
          .includes(searchText) ||
        String(caseItem.id)
          .includes(searchText) ||
        caseItem.category
          .toLowerCase()
          .includes(searchText) ||
        caseItem.description
          .toLowerCase()
          .includes(searchText)

      return (
        matchesFilter &&
        matchesSearch
      )
    })

  // =========================================================
  // STATUS DISPLAY
  // =========================================================

  const getStatusLabel = (status: CaseStatus) => {
    if (
      status === 'resolved' ||
      status === 'closed'
    ) {
      return 'Closed'
    }

    return 'Processing'
  }

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return ''
    }

    try {
      return new Date(
        date
      ).toLocaleDateString(
        'en-IN',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      )
    } catch {
      return ''
    }
  }

  // =========================================================
  // ACTIVE COUNT
  // =========================================================

  const activeCount =
    cases.filter(
      c =>
        c.status === 'open' ||
        c.status === 'in_progress'
    ).length

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="page-enter">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
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
              letterSpacing: '-0.03em',
            }}
          >
            My Cases
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              marginTop: 2,
            }}
          >
            {cases.length} cases tracked ·{' '}
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
            style={{
              padding: '9px 12px',
              borderRadius: 9,
              border:
                '1px solid var(--border)',
              background:
                'var(--bg-secondary)',
              color:
                'var(--text-muted)',
              cursor: loading
                ? 'default'
                : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
            title="Refresh cases"
          >

            {loading ? (
              <Loader2
                size={14}
                style={{
                  animation:
                    'spin 1s linear infinite',
                }}
              />
            ) : (
              <RefreshCw size={14} />
            )}

            Refresh

          </button>

          {/* NEW CASE */}

          <button
            onClick={() =>
              navigate('/dashboard/new-case')
            }
            className="btn-primary"
            style={{
              padding: '9px 16px',
              borderRadius: 9,
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Start New Case
          </button>

        </div>

      </div>

      {/* =====================================================
          SEARCH / FILTER
      ===================================================== */}

      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 18,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >

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
              position: 'absolute',
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
            onChange={e =>
              setSearch(e.target.value)
            }
            style={{
              paddingLeft: 30,
            }}
          />

        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
          }}
        >

          {(
            [
              'All',
              'Processing',
              'Closed',
            ] as const
          ).map(f => (

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
                cursor: 'pointer',
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

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (

        <div
          className="card"
          style={{
            padding: 60,
            textAlign: 'center',
          }}
        >

          <Loader2
            size={30}
            style={{
              color: 'var(--blue)',
              animation:
                'spin 1s linear infinite',
              marginBottom: 12,
            }}
          />

          <div
            style={{
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Loading your cases...
          </div>

        </div>

      )}

      {/* =====================================================
          CASE LIST
      ===================================================== */}

      {!loading && (

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >

          {filteredCases.map(caseItem => {

            const status =
              statusColor[
                caseItem.status
              ] ||
              statusColor.open

            return (

              <div
                key={caseItem.id}
                className="card card-interactive"
                onClick={() =>
                  navigate(
                    `/dashboard/cases/${caseItem.id}`
                  )
                }
                style={{
                  padding: 18,
                  cursor: 'pointer',
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'flex-start',
                    gap: 12,
                    marginBottom: 10,
                    flexWrap:
                      'wrap',
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
                        fontWeight: 700,
                        color:
                          'var(--text)',
                        fontSize:
                          '0.95rem',
                      }}
                    >
                      {caseItem.title}
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
                      Case #{caseItem.id}
                      {' · '}
                      {caseItem.category}
                      {' · '}
                      Created{' '}
                      {formatDate(
                        caseItem.created_at
                      )}
                    </div>

                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 8,
                    }}
                  >

                    <span
                      className="badge"
                      style={{
                        background:
                          status.bg,
                        color:
                          status.c,
                      }}
                    >
                      {status.label}
                    </span>

                    {/* DELETE */}

                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteCase(
                          caseItem.id
                        )
                      }}
                      disabled={
                        deletingId ===
                        caseItem.id
                      }
                      title="Delete case"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border:
                          '1px solid var(--border)',
                        background:
                          'var(--bg-secondary)',
                        color: '#EF4444',
                        cursor:
                          deletingId ===
                          caseItem.id
                            ? 'default'
                            : 'pointer',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        opacity:
                          deletingId ===
                          caseItem.id
                            ? 0.5
                            : 1,
                      }}
                    >

                      {deletingId ===
                      caseItem.id ? (
                        <Loader2
                          size={13}
                          style={{
                            animation:
                              'spin 1s linear infinite',
                          }}
                        />
                      ) : (
                        <Trash2
                          size={13}
                        />
                      )}

                    </button>

                  </div>

                </div>

                {/* DESCRIPTION */}

                {caseItem.description && (

                  <div
                    style={{
                      fontSize:
                        '0.78rem',
                      color:
                        'var(--text-muted)',
                      marginBottom: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    {caseItem.description}
                  </div>

                )}
                <div
                  style={{
                    marginTop: 8,
                    fontSize: '0.72rem',
                    color: status.c,
                    fontWeight: 650,
                  }}
                >
                  {getStatusLabel(caseItem.status)}
                </div>

              </div>

            )
          })}

          {/* =================================================
              NO CASES
          ================================================= */}

          {filteredCases.length === 0 && (

            <div
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
                  marginBottom: 10,
                }}
              />

              <div
                style={{
                  fontWeight: 700,
                  color:
                    'var(--text)',
                  marginBottom: 4,
                }}
              >
                {cases.length === 0
                  ? 'No cases yet'
                  : 'No cases found'}
              </div>

              <div
                style={{
                  color:
                    'var(--text-muted)',
                  fontSize:
                    '0.85rem',
                  marginBottom: 16,
                }}
              >
                {cases.length === 0
                  ? 'Create your first legal case to start organizing your legal matter.'
                  : 'Try a different filter or search term'}
              </div>

              {cases.length === 0 && (

                <button
                  onClick={() =>
                    navigate(
                      '/dashboard/new-case'
                    )
                  }
                  className="btn-primary"
                  style={{
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    gap: 6,
                    padding:
                      '9px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize:
                      '0.8rem',
                  }}
                >
                  <Plus size={14} />
                  Start New Case
                </button>

              )}

            </div>

          )}

        </div>

      )}

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