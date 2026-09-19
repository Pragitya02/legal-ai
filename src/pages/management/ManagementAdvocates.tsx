import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import { useNavigate } from 'react-router'

import {
  ArrowLeft,
  Loader2,
  Search,
  Scale,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL || ''

type ManagementAdvocate = {
  id: number
  fullName: string
  email: string
  phone: string
  role: string
  createdAt: string
  lawyerId: number | null
  specialization: string
  experience: string
  location: string
  bio: string
  verified: boolean
  highCourt: string
  enrollmentYear: string | number
}

type AdvocatesResponse = {
  success: boolean
  advocates?: ManagementAdvocate[]
  message?: string
}

export default function ManagementAdvocates() {
  const navigate = useNavigate()

  const [advocates, setAdvocates] =
    useState<ManagementAdvocate[]>([])

  const [search, setSearch] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadAdvocates(
    searchValue = '',
  ) {
    try {
      setLoading(true)
      setError('')

      const params =
        new URLSearchParams()

      if (searchValue.trim()) {
        params.set(
          'search',
          searchValue.trim(),
        )
      }

      params.set('limit', '100')

      const response = await fetch(
        `${API_URL}/api/management/advocates?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to load advocates.',
        )
      }

      const data =
        (await response.json()) as AdvocatesResponse

      if (!data.success) {
        throw new Error(
          data.message ||
            'Unable to load advocates.',
        )
      }

      setAdvocates(
        data.advocates || [],
      )
    } catch (err) {
      console.error(
        '[MANAGEMENT ADVOCATES]',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load advocates.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAdvocates()
  }, [])

  function handleSearch(
    event: FormEvent,
  ) {
    event.preventDefault()

    void loadAdvocates(search)
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
            <Scale
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
            Advocates
          </h1>

          <p
            className="mt-2 max-w-2xl text-sm leading-6"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            View registered advocate profiles.
            Management access is read-only.
          </p>
        </section>

        <form
          onSubmit={handleSearch}
          className="mb-6 flex gap-3"
        >
          <div className="relative flex-1">
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
              placeholder="Search by name, email, phone, specialization or location..."
              className="w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

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
        ) : advocates.length === 0 ? (
          <div
            className="rounded-3xl border p-12 text-center"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <Scale
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
              No advocates found
            </p>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Try another search.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border">
            <div
              className="grid grid-cols-[1.2fr_1.2fr_1fr_150px] gap-4 border-b px-5 py-4 text-xs font-semibold uppercase tracking-wider"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <span>Advocate</span>

              <span>Professional</span>

              <span>Location</span>

              <span>Status</span>
            </div>

            {advocates.map((advocate) => (
              <div
                key={advocate.id}
                className="grid grid-cols-[1.2fr_1.2fr_1fr_150px] gap-4 border-b px-5 py-5"
                style={{
                  background: 'var(--bg)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background:
                        'rgba(212,175,55,0.10)',
                      color: '#D4AF37',
                    }}
                  >
                    <Scale size={18} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{
                        color: 'var(--text)',
                      }}
                    >
                      {advocate.fullName ||
                        'Unnamed Advocate'}
                    </p>

                    <p
                      className="mt-1 truncate text-xs"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      {advocate.email}
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      ID #{advocate.id}
                    </p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-medium"
                    style={{
                      color: 'var(--text)',
                    }}
                  >
                    {advocate.specialization ||
                      'Not specified'}
                  </p>

                  <p
                    className="mt-1 text-xs"
                    style={{
                      color: 'var(--text-muted)',
                    }}
                  >
                    Experience:{' '}
                    {advocate.experience ||
                      'Not specified'}
                  </p>

                  <p
                    className="mt-1 text-xs"
                    style={{
                      color: 'var(--text-muted)',
                    }}
                  >
                    {advocate.highCourt
                      ? `Court: ${advocate.highCourt}`
                      : 'Court not specified'}
                  </p>

                  {advocate.enrollmentYear && (
                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      Enrollment:{' '}
                      {advocate.enrollmentYear}
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className="truncate text-sm"
                    style={{
                      color: 'var(--text)',
                    }}
                  >
                    {advocate.location ||
                      'Location not specified'}
                  </p>

                  <p
                    className="mt-1 truncate text-xs"
                    style={{
                      color: 'var(--text-muted)',
                    }}
                  >
                    {advocate.phone ||
                      'No phone'}
                  </p>
                </div>

                <div>
                  {advocate.verified ? (
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background:
                          'rgba(34,197,94,0.10)',
                        color:
                          'rgb(74,222,128)',
                      }}
                    >
                      <ShieldCheck size={14} />
                      Verified
                    </div>
                  ) : (
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background:
                          'rgba(245,158,11,0.10)',
                        color:
                          'rgb(251,191,36)',
                      }}
                    >
                      <ShieldAlert size={14} />
                      Unverified
                    </div>
                  )}

                  <p
                    className="mt-2 text-xs"
                    style={{
                      color: 'var(--text-muted)',
                    }}
                  >
                    Joined:{' '}
                    {advocate.createdAt
                      ? new Date(
                          advocate.createdAt,
                        ).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}