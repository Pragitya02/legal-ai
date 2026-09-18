import {
  ArrowLeft,
  BadgeCheck,
  Loader2,
  Scale,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

const API_URL =
  import.meta.env.VITE_API_URL || ''

type Advocate = {
  id: number
  fullName: string
  email: string
  phone: string
  specialization: string
  experience: string
  location: string
  verified: boolean
  highCourt: string
  enrollmentYear: string
}

type AdvocatesResponse = {
  success: boolean
  advocates?: Advocate[]
  message?: string
}

export default function AdminAdvocates() {
  const navigate = useNavigate()

  const [advocates, setAdvocates] = useState<
    Advocate[]
  >([])

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadAdvocates(
    searchValue = '',
  ) {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      if (searchValue.trim()) {
        params.set(
          'search',
          searchValue.trim(),
        )
      }

      params.set('limit', '100')

      const response = await fetch(
        `${API_URL}/api/admin/advocates?${params.toString()}`,
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

      setAdvocates(data.advocates || [])
    } catch (err) {
      console.error(
        '[ADMIN ADVOCATES]',
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

  function openAdvocate(advocateId: number) {
    navigate(
      `/admin/advocates/${advocateId}`,
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
              navigate('/admin/dashboard')
            }
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>

          <div className="flex items-center gap-2">
            <ShieldCheck
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
              Administrator
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
            Professional Management
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
            Review registered advocate accounts
            and professional profile information.
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
              placeholder="Search by name, email, specialization or location..."
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
              className="grid grid-cols-[1.2fr_1fr_1fr_120px] gap-4 border-b px-5 py-4 text-xs font-semibold uppercase tracking-wider"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <span>Advocate</span>
              <span>Practice</span>
              <span>Location</span>
              <span>Status</span>
            </div>

            {advocates.map((advocate) => (
              <button
                key={advocate.id}
                type="button"
                onClick={() =>
                  openAdvocate(advocate.id)
                }
                aria-label={`Open ${
                  advocate.fullName ||
                  'advocate'
                } details`}
                className="grid w-full grid-cols-[1.2fr_1fr_1fr_120px] gap-4 border-b px-5 py-5 text-left transition-colors hover:bg-white/[0.03]"
                style={{
                  background: 'var(--bg)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center gap-3">
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
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      {advocate.email}
                    </p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p
                    className="truncate text-sm"
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
                      color:
                        'var(--text-muted)',
                    }}
                  >
                    {advocate.experience
                      ? `${advocate.experience} experience`
                      : 'Experience not specified'}
                  </p>
                </div>

                <div
                  className="truncate text-sm"
                  style={{
                    color: 'var(--text)',
                  }}
                >
                  {advocate.location ||
                    'Not specified'}
                </div>

                <div>
                  {advocate.verified ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background:
                          'rgba(34,197,94,0.10)',
                        color:
                          'rgb(34,197,94)',
                      }}
                    >
                      <BadgeCheck size={13} />
                      Verified
                    </span>
                  ) : (
                    <span
                      className="text-xs"
                      style={{
                        color:
                          'var(--text-muted)',
                      }}
                    >
                      Unverified
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
