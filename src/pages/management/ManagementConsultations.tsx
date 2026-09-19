import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { useNavigate } from 'react-router'

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Loader2,
  Search,
  Video,
  CheckCircle2,
  XCircle,
  Hourglass,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL || ''

type Consultation = {
  id: number
  citizenId: number
  citizenName: string
  citizenEmail: string

  advocateId: number
  advocateName: string
  advocateEmail: string

  appointmentDate: string
  status: string
  notes: string

  meetingId: number | null
  scheduledStart: string | null
  scheduledEnd: string | null
  roomName: string | null

  mode: string
}

type Summary = {
  totalConsultations: number
  pendingConsultations: number
  confirmedConsultations: number
  completedConsultations: number
  cancelledConsultations: number
}

type ConsultationResponse = {
  success: boolean
  summary?: Summary
  consultations?: Consultation[]
  message?: string
}

function formatStatus(status: string) {
  const normalized =
    status.toLowerCase()

  if (normalized === 'confirmed') {
    return {
      label: 'Confirmed',
      icon: CheckCircle2,
    }
  }

  if (normalized === 'completed') {
    return {
      label: 'Completed',
      icon: CheckCircle2,
    }
  }

  if (normalized === 'cancelled') {
    return {
      label: 'Cancelled',
      icon: XCircle,
    }
  }

  if (normalized === 'pending') {
    return {
      label: 'Pending',
      icon: Hourglass,
    }
  }

  return {
    label:
      status || 'Unknown',
    icon: Clock3,
  }
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  )
}

function formatTime(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

export default function ManagementConsultations() {
  const navigate = useNavigate()

  const [consultations, setConsultations] =
    useState<Consultation[]>([])

  const [summary, setSummary] =
    useState<Summary>({
      totalConsultations: 0,
      pendingConsultations: 0,
      confirmedConsultations: 0,
      completedConsultations: 0,
      cancelledConsultations: 0,
    })

  const [search, setSearch] =
    useState('')

  const [status, setStatus] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadConsultations(
    searchValue = '',
    statusValue = '',
  ) {
    try {
      setLoading(true)
      setError('')

      const params =
        new URLSearchParams()

      params.set(
        'limit',
        '100',
      )

      if (searchValue.trim()) {
        params.set(
          'search',
          searchValue.trim(),
        )
      }

      if (statusValue) {
        params.set(
          'status',
          statusValue,
        )
      }

      const response = await fetch(
        `${API_URL}/api/management/consultations?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to load consultations.',
        )
      }

      const data =
        (await response.json()) as ConsultationResponse

      if (!data.success) {
        throw new Error(
          data.message ||
            'Unable to load consultations.',
        )
      }

      setConsultations(
        data.consultations || [],
      )

      setSummary(
        data.summary || {
          totalConsultations: 0,
          pendingConsultations: 0,
          confirmedConsultations: 0,
          completedConsultations: 0,
          cancelledConsultations: 0,
        },
      )
    } catch (err) {
      console.error(
        '[MANAGEMENT CONSULTATIONS]',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load consultations.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConsultations()
  }, [])

  function handleSearch(
    event: FormEvent,
  ) {
    event.preventDefault()

    void loadConsultations(
      search,
      status,
    )
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          background:
            'color-mix(in srgb, var(--bg) 90%, transparent)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <button
            type="button"
            onClick={() =>
              navigate('/management')
            }
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            <ArrowLeft size={17} />

            Management Dashboard
          </button>

          <div className="flex items-center gap-2">
            <CalendarDays
              size={18}
              style={{
                color: '#D4AF37',
              }}
            />

            <span
              className="text-sm font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Management
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <section className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{
              color: '#D4AF37',
            }}
          >
            Management
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Consultations
          </h1>

          <p
            className="mt-2 max-w-3xl text-sm leading-6"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Monitor consultation appointments between
            citizens and advocates. Management access
            is read-only.
          </p>
        </section>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <CalendarDays
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p className="mt-4 text-2xl font-bold">
              {summary.totalConsultations}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Total Consultations
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <Hourglass
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p className="mt-4 text-2xl font-bold">
              {summary.pendingConsultations}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Pending
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <CheckCircle2
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p className="mt-4 text-2xl font-bold">
              {summary.confirmedConsultations}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Confirmed
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <CheckCircle2
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p className="mt-4 text-2xl font-bold">
              {summary.completedConsultations}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Completed
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <XCircle
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p className="mt-4 text-2xl font-bold">
              {summary.cancelledConsultations}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Cancelled
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="mb-6 grid gap-3 lg:grid-cols-[1fr_220px_auto]"
        >
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
              style={{
                color: 'var(--text-muted)',
              }}
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by citizen, advocate, email or consultation ID..."
              className="w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              const next =
                event.target.value

              setStatus(next)

              void loadConsultations(
                search,
                next,
              )
            }}
            className="rounded-2xl border px-4 py-3 text-sm outline-none"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="">
              All Statuses
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="confirmed">
              Confirmed
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="cancelled">
              Cancelled
            </option>
          </select>

          <button
            type="submit"
            className="rounded-2xl px-5 py-3 text-sm font-semibold"
            style={{
              background: '#D4AF37',
              color: '#111',
            }}
          >
            Search
          </button>
        </form>

        {error && (
          <div
            className="mb-6 rounded-2xl border p-4 text-sm"
            style={{
              borderColor:
                'rgba(220,38,38,0.25)',
              background:
                'rgba(220,38,38,0.06)',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2
              size={28}
              className="animate-spin"
              style={{
                color: '#D4AF37',
              }}
            />
          </div>
        ) : consultations.length === 0 ? (
          <div
            className="rounded-3xl border p-12 text-center"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <CalendarDays
              size={32}
              className="mx-auto mb-4"
              style={{
                color: 'var(--text-muted)',
              }}
            />

            <p className="font-semibold">
              No consultations found
            </p>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              No consultations match the current
              filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border">
            <div className="min-w-[1100px]">
              <div
                className="grid grid-cols-[80px_1.2fr_1.2fr_180px_130px_120px] gap-4 border-b px-5 py-4 text-xs font-semibold uppercase tracking-wider"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                <span>ID</span>

                <span>Citizen</span>

                <span>Advocate</span>

                <span>Schedule</span>

                <span>Status</span>

                <span>Meeting</span>
              </div>

              {consultations.map(
                (consultation) => {
                  const statusInfo =
                    formatStatus(
                      consultation.status,
                    )

                  const StatusIcon =
                    statusInfo.icon

                  return (
                    <div
                      key={consultation.id}
                      className="grid grid-cols-[80px_1.2fr_1.2fr_180px_130px_120px] gap-4 border-b px-5 py-5"
                      style={{
                        background:
                          'var(--bg)',
                        borderColor:
                          'var(--border)',
                      }}
                    >
                      <div
                        className="text-sm font-semibold"
                        style={{
                          color: '#D4AF37',
                        }}
                      >
                        #{consultation.id}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {
                            consultation.citizenName
                          }
                        </p>

                        <p
                          className="mt-1 truncate text-xs"
                          style={{
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          {
                            consultation.citizenEmail
                          }
                        </p>

                        <p
                          className="mt-1 text-xs"
                          style={{
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          Citizen
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {
                            consultation.advocateName
                          }
                        </p>

                        <p
                          className="mt-1 truncate text-xs"
                          style={{
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          {
                            consultation.advocateEmail
                          }
                        </p>

                        <p
                          className="mt-1 text-xs"
                          style={{
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          Advocate
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <CalendarDays
                            size={15}
                            style={{
                              color:
                                '#D4AF37',
                            }}
                          />

                          <span className="text-sm">
                            {formatDate(
                              consultation.appointmentDate,
                            )}
                          </span>
                        </div>

                        <div
                          className="mt-2 flex items-center gap-2 text-xs"
                          style={{
                            color:
                              'var(--text-muted)',
                          }}
                        >
                          <Clock3 size={14} />

                          {formatTime(
                            consultation.appointmentDate,
                          )}
                        </div>
                      </div>

                      <div>
                        <div
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                          style={{
                            background:
                              consultation.status.toLowerCase() ===
                              'completed'
                                ? 'rgba(34,197,94,0.10)'
                                : consultation.status.toLowerCase() ===
                                  'cancelled'
                                ? 'rgba(220,38,38,0.10)'
                                : 'rgba(212,175,55,0.10)',

                            color:
                              consultation.status.toLowerCase() ===
                              'completed'
                                ? 'rgb(74,222,128)'
                                : consultation.status.toLowerCase() ===
                                  'cancelled'
                                ? 'rgb(248,113,113)'
                                : '#D4AF37',
                          }}
                        >
                          <StatusIcon size={14} />

                          {
                            statusInfo.label
                          }
                        </div>
                      </div>

                      <div>
                        {consultation.meetingId ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Video
                                size={15}
                                style={{
                                  color:
                                    '#D4AF37',
                                }}
                              />

                              <span className="text-xs font-semibold">
                                Available
                              </span>
                            </div>

                            <p
                              className="mt-2 text-xs"
                              style={{
                                color:
                                  'var(--text-muted)',
                              }}
                            >
                              {
                                consultation.mode
                              }
                            </p>
                          </>
                        ) : (
                          <span
                            className="text-xs"
                            style={{
                              color:
                                'var(--text-muted)',
                            }}
                          >
                            Not created
                          </span>
                        )}
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}