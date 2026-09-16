import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { isLoggedIn } from '../lib/auth'
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  StickyNote,
  FolderOpen,
  CalendarDays,
  Shield,
  Loader2,
  Save,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

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

const statusMap: Record<
  CaseStatus,
  { label: string; color: string; background: string }
> = {
  open: {
    label: 'Processing',
    color: '#F59E0B',
    background: 'rgba(245,158,11,0.1)',
  },
  in_progress: {
    label: 'Processing',
    color: '#F59E0B',
    background: 'rgba(245,158,11,0.1)',
  },
  resolved: {
    label: 'Closed',
    color: 'var(--text-muted)',
    background: 'rgba(120,120,120,0.1)',
  },
  closed: {
    label: 'Closed',
    color: 'var(--text-muted)',
    background: 'rgba(120,120,120,0.1)',
  },
}

export default function CaseWorkspace() {
  const { caseId } = useParams()
  const navigate = useNavigate()

  const [caseItem, setCaseItem] = useState<CaseItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesError, setNotesError] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)


  const openNotes = async () => {
    if (!caseItem || notesLoading) return

    setShowNotes(true)
    setNotesError('')
    setNotesSaved(false)

    try {
      setNotesLoading(true)

      const response = await fetch(
        `${API_BASE}/api/cases/${caseItem.id}/notes`,
        { credentials: 'include' }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to load notes.'
        )
      }

      setNoteText(data.note?.note_text || '')
    } catch (err) {
      console.error('LOAD NOTES ERROR:', err)
      setNotesError(
        err instanceof Error
          ? err.message
          : 'Failed to load notes.'
      )
    } finally {
      setNotesLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!caseItem || notesSaving) return

    try {
      setNotesSaving(true)
      setNotesError('')
      setNotesSaved(false)

      const response = await fetch(
        `${API_BASE}/api/cases/${caseItem.id}/notes`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            note_text: noteText,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to save notes.'
        )
      }

      setNotesSaved(true)

      window.setTimeout(() => {
        setNotesSaved(false)
      }, 2500)
    } catch (err) {
      console.error('SAVE NOTES ERROR:', err)
      setNotesError(
        err instanceof Error
          ? err.message
          : 'Failed to save notes.'
      )
    } finally {
      setNotesSaving(false)
    }
  }

  const handleCloseCase = async () => {
    if (!caseItem || closing || caseItem.status === 'closed') {
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to close this case?'
    )

    if (!confirmed) {
      return
    }

    try {
      setClosing(true)

      const response = await fetch(
        `${API_BASE}/api/cases/${caseItem.id}/close`,
        {
          method: 'PATCH',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Failed to close case.'
        )
      }

      if (data.case) {
        setCaseItem(data.case)
      } else {
        setCaseItem(previous =>
          previous
            ? {
                ...previous,
                status: 'closed',
                updated_at: new Date().toISOString(),
              }
            : previous
        )
      }
    } catch (err) {
      console.error('CLOSE CASE ERROR:', err)

      alert(
        err instanceof Error
          ? err.message
          : 'Failed to close case.'
      )
    } finally {
      setClosing(false)
    }
  }

  useEffect(() => {
    const loadCase = async () => {
      if (!isLoggedIn()) {
        navigate('/login')
        return
      }

      const id = Number(caseId)

      if (!Number.isInteger(id) || id <= 0) {
        setError('Invalid case.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/cases/${id}`,
          {
            credentials: 'include',
          }
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || 'Failed to load case.'
          )
        }

        setCaseItem(data.case)
      } catch (err) {
        console.error('LOAD CASE ERROR:', err)

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load case.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadCase()
  }, [caseId, navigate])

  if (loading) {
    return (
      <div
        className="card"
        style={{
          padding: 70,
          textAlign: 'center',
        }}
      >
        <Loader2
          size={30}
          style={{
            color: 'var(--blue)',
            animation: 'spin 1s linear infinite',
          }}
        />

        <div
          style={{
            marginTop: 12,
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          Loading case workspace...
        </div>

        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    )
  }

  if (error || !caseItem) {
    return (
      <div
        className="card"
        style={{
          padding: 50,
          textAlign: 'center',
        }}
      >
        <FolderOpen
          size={36}
          color="var(--text-subtle)"
        />

        <h2
          style={{
            color: 'var(--text)',
            fontSize: '1.05rem',
            marginTop: 12,
          }}
        >
          Case unavailable
        </h2>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
          }}
        >
          {error || 'This case could not be found.'}
        </p>

        <Link
          to="/dashboard/cases"
          className="btn-primary"
          style={{
            display: 'inline-flex',
            marginTop: 12,
            padding: '9px 15px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 650,
          }}
        >
          Back to My Cases
        </Link>
      </div>
    )
  }

  const status = statusMap[caseItem.status]

  const formatDate = (value: string) => {
    if (!value) return ''

    return new Date(value).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  const workspaceItems = [
    {
      icon: FileText,
      title: 'Documents',
      description:
        'Keep documents related to this case together.',
      path: '/dashboard/documents',
    },
    {
      icon: MessageSquare,
      title: 'Case Conversations',
      description:
        'Continue discussions related to this case.',
      path: '/dashboard/ai-assistant',
    },
    {
      icon: StickyNote,
      title: 'Notes',
      description:
        'Keep your own notes and important reminders.',
      path: '#notes',
    },
  ]

  return (
    <div className="page-enter">
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
          marginBottom: 20,
          fontSize: '0.82rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={15} />
        My Cases
      </button>

      <div
        className="card"
        style={{
          padding: 22,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                marginBottom: 9,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'var(--blue-subtle)',
                  color: 'var(--blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FolderOpen size={19} />
              </div>

              <div>
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem',
                  }}
                >
                  Case #{caseItem.id}
                </div>

                <h1
                  style={{
                    margin: 0,
                    color: 'var(--text)',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    letterSpacing: '-0.025em',
                  }}
                >
                  {caseItem.title}
                </h1>
              </div>
            </div>

            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.84rem',
                lineHeight: 1.6,
                margin: '10px 0 0',
                maxWidth: 800,
              }}
            >
              {caseItem.description}
            </p>
          </div>

          <span
            className="badge"
            style={{
              color: status.color,
              background: status.background,
              whiteSpace: 'nowrap',
            }}
          >
            {status.label}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 18,
            flexWrap: 'wrap',
            marginTop: 18,
            paddingTop: 15,
            borderTop: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span>
              <Shield
                size={13}
                style={{
                  verticalAlign: 'middle',
                  marginRight: 5,
                }}
              />
              {caseItem.category}
            </span>

            <span>
              Priority: <strong>{caseItem.severity}</strong>
            </span>

            <span>
              <CalendarDays
                size={13}
                style={{
                  verticalAlign: 'middle',
                  marginRight: 5,
                }}
              />
              Created {formatDate(caseItem.created_at)}
            </span>
          </div>

          {caseItem.status !== 'closed' &&
            caseItem.status !== 'resolved' && (
              <button
                type="button"
                onClick={handleCloseCase}
                disabled={closing}
                style={{
                  padding: '8px 13px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: '#EF4444',
                  cursor: closing ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  opacity: closing ? 0.6 : 1,
                  flexShrink: 0,
                }}
              >
                {closing && (
                  <Loader2
                    size={13}
                    style={{
                      animation:
                        'spin 1s linear infinite',
                    }}
                  />
                )}
                {closing ? 'Closing...' : 'Close Case'}
              </button>
            )}
        </div>
      </div>

      <div style={{ marginBottom: 13 }}>
        <h2
          style={{
            color: 'var(--text)',
            fontSize: '1rem',
            fontWeight: 750,
            margin: 0,
          }}
        >
          Case Workspace
        </h2>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            marginTop: 4,
          }}
        >
          Everything related to this legal matter belongs here.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {workspaceItems.map(item => {
          const Icon = item.icon

          if (item.path === '#notes') {
            return (
              <button
                key={item.title}
                type="button"
                className="card card-interactive"
                onClick={openNotes}
                style={{
                  padding: 19,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                }}
              >
                <Icon
                  size={20}
                  color="var(--blue)"
                />

                <div
                  style={{
                    marginTop: 13,
                    color: 'var(--text)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    lineHeight: 1.5,
                  }}
                >
                  {item.description}
                </div>
              </button>
            )
          }

          return (
            <Link
              key={item.title}
              to={item.path}
              className="card card-interactive"
              style={{
                padding: 19,
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <Icon
                size={20}
                color="var(--blue)"
              />

              <div
                style={{
                  marginTop: 13,
                  color: 'var(--text)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  marginTop: 5,
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                }}
              >
                {item.description}
              </div>
            </Link>
          )
        })}
      </div>
      {/* =====================================================
          NYAYA AI NOTEPAD
      ===================================================== */}

      {showNotes && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="nyaya-notes-title"
          onClick={() => setShowNotes(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(5px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 760,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              boxShadow: '0 25px 80px rgba(0,0,0,0.45)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'var(--blue-subtle)',
                    color: 'var(--blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StickyNote size={19} />
                </div>

                <div>
                  <h2
                    id="nyaya-notes-title"
                    style={{
                      margin: 0,
                      color: 'var(--text)',
                      fontSize: '1rem',
                      fontWeight: 800,
                    }}
                  >
                    Nyaya AI Notepad
                  </h2>

                  <div
                    style={{
                      marginTop: 3,
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                    }}
                  >
                    Notes for Case #{caseItem.id}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNotes(false)}
                aria-label="Close notes"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: 20,
                overflowY: 'auto',
              }}
            >
              {notesLoading ? (
                <div
                  style={{
                    minHeight: 330,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                  }}
                >
                  <Loader2
                    size={26}
                    style={{
                      color: 'var(--blue)',
                      animation:
                        'spin 1s linear infinite',
                    }}
                  />
                  <div style={{ marginTop: 10 }}>
                    Loading your notes...
                  </div>
                </div>
              ) : (
                <>
                  <textarea
                    value={noteText}
                    onChange={e => {
                      setNoteText(e.target.value)
                      setNotesSaved(false)
                    }}
                    maxLength={20000}
                    autoFocus
                    placeholder={`Write your notes here...

Add important facts, questions, dates, reminders, documents to collect, or anything else related to this case.`}
                    style={{
                      width: '100%',
                      minHeight: 330,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text)',
                      outline: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      lineHeight: 1.65,
                    }}
                  />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginTop: 7,
                      color: 'var(--text-subtle)',
                      fontSize: '0.68rem',
                    }}
                  >
                    <span>
                      Your notes are saved to this case.
                    </span>
                    <span>
                      {noteText.length.toLocaleString()} / 20,000
                    </span>
                  </div>

                  {notesError && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '9px 11px',
                        borderRadius: 8,
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#EF4444',
                        fontSize: '0.76rem',
                      }}
                    >
                      {notesError}
                    </div>
                  )}
                </>
              )}
            </div>

            {!notesLoading && (
              <div
                style={{
                  padding: '13px 20px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                }}
              >
                {notesSaved && (
                  <span
                    style={{
                      marginRight: 'auto',
                      color: 'var(--emerald)',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                    }}
                  >
                    ✓ Notes saved
                  </span>
                )}

                {!notesSaved && (
                  <span style={{ marginRight: 'auto' }} />
                )}

                <button
                  type="button"
                  onClick={() => setShowNotes(false)}
                  style={{
                    padding: '9px 15px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={notesSaving}
                  className="btn-primary"
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: notesSaving ? 'default' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontWeight: 700,
                    opacity: notesSaving ? 0.65 : 1,
                  }}
                >
                  {notesSaving ? (
                    <Loader2
                      size={14}
                      style={{
                        animation:
                          'spin 1s linear infinite',
                      }}
                    />
                  ) : (
                    <Save size={14} />
                  )}
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  )
}