import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { useNavigate } from 'react-router'

import {
  ArrowLeft,
  FileBarChart,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Star,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL || ''

type Report = {
  id: number
  appointmentId: number

  reporterId: number
  reporterName: string
  reporterEmail: string
  reporterRole: string

  reportedUserId: number
  reportedUserName: string
  reportedUserEmail: string
  reportedUserRole: string

  category: string
  customReason: string
  details: string
  status: string
  createdAt: string
}

type Category = {
  category: string
  count: number
}

type Summary = {
  totalReports: number
  openReports: number
  resolvedReports: number
  totalFeedback: number
  averageRating: number
}

type ReportsResponse = {
  success: boolean
  summary?: Summary
  categories?: Category[]
  reports?: Report[]
  message?: string
}

function formatCategory(
  category: string,
) {
  const labels: Record<string, string> = {
    technical_issue:
      'Technical Issue',

    bad_behaviour:
      'Bad Behaviour',

    unprofessional_conduct:
      'Unprofessional Conduct',

    harassment:
      'Harassment',

    misleading_information:
      'Misleading Information',

    payment_issue:
      'Payment Issue',

    other:
      'Other',

    custom:
      'Custom',
  }

  return (
    labels[category] ||
    category
      .split('_')
      .join(' ')
      .replace(/\b\w/g, (letter: string) =>
        letter.toUpperCase(),
      )
  )
}

function formatRole(
  role: string,
) {
  if (
    role === 'lawyer' ||
    role === 'advocate'
  ) {
    return 'Advocate'
  }

  if (
    role === 'citizen' ||
    role === 'user'
  ) {
    return 'Citizen'
  }

  return role || 'Unknown'
}

function formatStatus(
  status: string,
) {
  const normalized =
    status.toLowerCase()

  if (normalized === 'resolved') {
    return {
      label: 'Resolved',
      icon: CheckCircle2,
    }
  }

  if (normalized === 'open') {
    return {
      label: 'Open',
      icon: Clock3,
    }
  }

  return {
    label:
      status || 'Unknown',
    icon: AlertCircle,
  }
}

export default function ManagementReports() {
  const navigate = useNavigate()

  const [reports, setReports] =
    useState<Report[]>([])

  const [categories, setCategories] =
    useState<Category[]>([])

  const [summary, setSummary] =
    useState<Summary>({
      totalReports: 0,
      openReports: 0,
      resolvedReports: 0,
      totalFeedback: 0,
      averageRating: 0,
    })

  const [search, setSearch] =
    useState('')

  const [status, setStatus] =
    useState('')

  const [category, setCategory] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadReports(
    searchValue = '',
    statusValue = '',
    categoryValue = '',
  ) {
    try {
      setLoading(true)
      setError('')

      const params =
        new URLSearchParams()

      params.set('limit', '100')

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

      if (categoryValue) {
        params.set(
          'category',
          categoryValue,
        )
      }

      const response = await fetch(
        `${API_URL}/api/management/reports?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to load reports.',
        )
      }

      const data =
        (await response.json()) as ReportsResponse

      if (!data.success) {
        throw new Error(
          data.message ||
            'Unable to load reports.',
        )
      }

      setReports(
        data.reports || [],
      )

      setCategories(
        data.categories || [],
      )

      setSummary(
        data.summary || {
          totalReports: 0,
          openReports: 0,
          resolvedReports: 0,
          totalFeedback: 0,
          averageRating: 0,
        },
      )
    } catch (err) {
      console.error(
        '[MANAGEMENT REPORTS]',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load reports.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [])

  function handleSearch(
    event: FormEvent,
  ) {
    event.preventDefault()

    void loadReports(
      search,
      status,
      category,
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
            <FileBarChart
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

          <h1
            className="mt-2 text-3xl font-bold tracking-tight"
            style={{
              color: 'var(--text)',
            }}
          >
            Reports
          </h1>

          <p
            className="mt-2 max-w-3xl text-sm leading-6"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            View operational and consultation
            feedback reports. Management access is
            read-only.
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
            <FileBarChart
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p
              className="mt-4 text-2xl font-bold"
              style={{
                color: 'var(--text)',
              }}
            >
              {summary.totalReports}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Total Reports
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <Clock3
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p
              className="mt-4 text-2xl font-bold"
              style={{
                color: 'var(--text)',
              }}
            >
              {summary.openReports}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Open Reports
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

            <p
              className="mt-4 text-2xl font-bold"
              style={{
                color: 'var(--text)',
              }}
            >
              {summary.resolvedReports}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Resolved Reports
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <FileBarChart
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p
              className="mt-4 text-2xl font-bold"
              style={{
                color: 'var(--text)',
              }}
            >
              {summary.totalFeedback}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Feedback Entries
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <Star
              size={22}
              style={{
                color: '#D4AF37',
              }}
            />

            <p
              className="mt-4 text-2xl font-bold"
              style={{
                color: 'var(--text)',
              }}
            >
              {summary.averageRating
                ? summary.averageRating.toFixed(
                    1,
                  )
                : '—'}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Average Rating
            </p>
          </div>
        </div>

        {categories.length > 0 && (
          <section className="mb-8">
            <h2
              className="mb-4 text-lg font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Report Categories
            </h2>

            <div className="flex flex-wrap gap-3">
              {categories.map(
                (item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => {
                      const next =
                        category ===
                        item.category
                          ? ''
                          : item.category

                      setCategory(next)

                      void loadReports(
                        search,
                        status,
                        next,
                      )
                    }}
                    className="rounded-full border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{
                      borderColor:
                        category ===
                        item.category
                          ? '#D4AF37'
                          : 'var(--border)',

                      background:
                        category ===
                        item.category
                          ? 'rgba(212,175,55,0.10)'
                          : 'var(--surface)',

                      color:
                        category ===
                        item.category
                          ? '#D4AF37'
                          : 'var(--text)',
                    }}
                  >
                    {formatCategory(
                      item.category,
                    )}

                    <span className="ml-2 opacity-60">
                      {item.count}
                    </span>
                  </button>
                ),
              )}
            </div>
          </section>
        )}

        <form
          onSubmit={handleSearch}
          className="mb-6 grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]"
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
              placeholder="Search reports..."
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

              void loadReports(
                search,
                next,
                category,
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

            <option value="open">
              Open
            </option>

            <option value="resolved">
              Resolved
            </option>
          </select>

          <select
            value={category}
            onChange={(event) => {
              const next =
                event.target.value

              setCategory(next)

              void loadReports(
                search,
                status,
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
              All Categories
            </option>

            <option value="technical_issue">
              Technical Issue
            </option>

            <option value="bad_behaviour">
              Bad Behaviour
            </option>

            <option value="unprofessional_conduct">
              Unprofessional Conduct
            </option>

            <option value="harassment">
              Harassment
            </option>

            <option value="misleading_information">
              Misleading Information
            </option>

            <option value="payment_issue">
              Payment Issue
            </option>

            <option value="other">
              Other
            </option>

            <option value="custom">
              Custom
            </option>
          </select>

          <button
            type="submit"
            className="rounded-2xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-85"
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
                'rgba(220, 38, 38, 0.25)',
              background:
                'rgba(220, 38, 38, 0.06)',
              color: 'var(--text)',
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
        ) : reports.length === 0 ? (
          <div
            className="rounded-3xl border p-12 text-center"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <FileBarChart
              size={32}
              className="mx-auto mb-4"
              style={{
                color: 'var(--text-muted)',
              }}
            />

            <p
              className="font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              No reports found
            </p>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              No reports match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border">
            <div
              className="grid grid-cols-[80px_1.2fr_1.2fr_1fr_120px_150px] gap-4 border-b px-5 py-4 text-xs font-semibold uppercase tracking-wider"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <span>ID</span>

              <span>Reporter</span>

              <span>Reported User</span>

              <span>Category</span>

              <span>Status</span>

              <span>Date</span>
            </div>

            {reports.map((report) => {
              const statusInfo =
                formatStatus(
                  report.status,
                )

              const StatusIcon =
                statusInfo.icon

              return (
                <div
                  key={report.id}
                  className="grid grid-cols-[80px_1.2fr_1.2fr_1fr_120px_150px] gap-4 border-b px-5 py-5"
                  style={{
                    background: 'var(--bg)',
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
                    #{report.id}
                  </div>

                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{
                        color: 'var(--text)',
                      }}
                    >
                      {report.reporterName}
                    </p>

                    <p
                      className="mt-1 truncate text-xs"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      {report.reporterEmail}
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      {formatRole(
                        report.reporterRole,
                      )}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{
                        color: 'var(--text)',
                      }}
                    >
                      {report.reportedUserName}
                    </p>

                    <p
                      className="mt-1 truncate text-xs"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      {report.reportedUserEmail}
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      {formatRole(
                        report.reportedUserRole,
                      )}
                    </p>
                  </div>

                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: 'var(--text)',
                      }}
                    >
                      {formatCategory(
                        report.category,
                      )}
                    </p>

                    {report.customReason && (
                      <p
                        className="mt-1 line-clamp-2 text-xs"
                        style={{
                          color:
                            'var(--text-muted)',
                        }}
                      >
                        {report.customReason}
                      </p>
                    )}

                    {report.details && (
                      <p
                        className="mt-1 line-clamp-2 text-xs"
                        style={{
                          color:
                            'var(--text-muted)',
                        }}
                      >
                        {report.details}
                      </p>
                    )}
                  </div>

                  <div>
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background:
                          report.status.toLowerCase() ===
                          'resolved'
                            ? 'rgba(34,197,94,0.10)'
                            : 'rgba(245,158,11,0.10)',

                        color:
                          report.status.toLowerCase() ===
                          'resolved'
                            ? 'rgb(74,222,128)'
                            : 'rgb(251,191,36)',
                      }}
                    >
                      <StatusIcon size={14} />

                      {statusInfo.label}
                    </div>
                  </div>

                  <div
                    className="text-xs"
                    style={{
                      color:
                        'var(--text-muted)',
                    }}
                  >
                    {report.createdAt
                      ? new Date(
                          report.createdAt,
                        ).toLocaleDateString()
                      : '—'}

                    <p className="mt-1">
                      Consultation #
                      {report.appointmentId}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}