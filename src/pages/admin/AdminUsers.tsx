import {
  ArrowLeft,
  Loader2,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

const API_URL =
  import.meta.env.VITE_API_URL || ''

type AdminUser = {
  id: number
  fullName: string
  email: string
  phone: string
  role: string
  createdAt: string
}

type UsersResponse = {
  success: boolean
  users?: AdminUser[]
  message?: string
}

export default function AdminUsers() {
  const navigate = useNavigate()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadUsers(searchValue = '') {
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
        `${API_URL}/api/admin/users?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to load users.',
        )
      }

      const data =
        (await response.json()) as UsersResponse

      if (!data.success) {
        throw new Error(
          data.message ||
            'Unable to load users.',
        )
      }

      setUsers(data.users || [])
    } catch (err) {
      console.error(
        '[ADMIN USERS]',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load users.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  function handleSearch(
    event: React.FormEvent,
  ) {
    event.preventDefault()
    void loadUsers(search)
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
            User Management
          </p>

          <h1
            className="mt-2 text-3xl font-bold tracking-tight"
            style={{
              color: 'var(--text)',
            }}
          >
            Users
          </h1>

          <p
            className="mt-2 max-w-2xl text-sm leading-6"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Manage citizen accounts and review
            account-level information.
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
              placeholder="Search by name, email or phone..."
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
        ) : users.length === 0 ? (
          <div
            className="rounded-3xl border p-12 text-center"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <User
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
              No users found
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
              className="grid grid-cols-[1fr_1fr_160px] gap-4 border-b px-5 py-4 text-xs font-semibold uppercase tracking-wider"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <span>User</span>
              <span>Contact</span>
              <span>Joined</span>
            </div>

            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                className="grid w-full grid-cols-[1fr_1fr_160px] gap-4 border-b px-5 py-5 text-left transition-colors hover:bg-white/[0.03]"
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
                    <User size={18} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{
                        color: 'var(--text)',
                      }}
                    >
                      {user.fullName ||
                        'Unnamed User'}
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      ID #{user.id}
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
                    {user.email}
                  </p>

                  <p
                    className="mt-1 text-xs"
                    style={{
                      color: 'var(--text-muted)',
                    }}
                  >
                    {user.phone || 'No phone'}
                  </p>
                </div>

                <div
                  className="text-xs"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                >
                  {user.createdAt
                    ? new Date(
                        user.createdAt,
                      ).toLocaleDateString()
                    : '—'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}