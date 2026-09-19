import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router'

import {
  Users,
  Scale,
  FileBarChart,
  LogOut,
  Loader2,
} from 'lucide-react'

import { clearStoredUser } from '../lib/auth'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5001'

interface ManagementUser {
  id?: number | string
  email?: string
  role?: string
}

interface ManagementMeResponse {
  success?: boolean
  user?: ManagementUser
}

export default function ManagementDashboard() {
  const navigate = useNavigate()

  const [user, setUser] =
    useState<ManagementUser | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [loggingOut, setLoggingOut] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    async function verifyManagement() {
      try {
        const response = await fetch(
          `${API_URL}/api/management/me`,
          {
            method: 'GET',
            credentials: 'include',
          },
        )

        if (!response.ok) {
          throw new Error(
            'Management session is not valid.',
          )
        }

        const data =
          (await response.json()) as ManagementMeResponse

        if (
          !data.success ||
          !data.user ||
          data.user.role !== 'management'
        ) {
          throw new Error(
            'Management access required.',
          )
        }

        if (!cancelled) {
          setUser(data.user)
        }
      } catch {
        clearStoredUser()

        if (!cancelled) {
          navigate('/managementlogin', {
            replace: true,
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void verifyManagement()

    return () => {
      cancelled = true
    }
  }, [navigate])

  async function handleLogout() {
    if (loggingOut) {
      return
    }

    setLoggingOut(true)

    try {
      await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )
    } finally {
      clearStoredUser()

      navigate('/managementlogin', {
        replace: true,
      })

      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
        }}
      >
        <Loader2
          size={28}
          className="animate-spin"
          style={{
            color: '#D4AF37',
          }}
        />
      </main>
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
        className="border-b px-6 py-5"
        style={{
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Nyaya
              <span
                style={{
                  color: '#D4AF37',
                }}
              >
                AI
              </span>
            </h1>

            <p
              className="text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Management
            </p>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
            style={{
              borderColor: 'var(--border)',
            }}
          >
            <LogOut size={16} />

            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p
          className="mb-8 text-sm"
          style={{
            color: 'var(--text-muted)',
          }}
        >
          Signed in as {user?.email}
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              navigate('/management/users')
            }
            className="rounded-2xl border p-6 text-left transition-opacity hover:opacity-85"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <Users
              size={28}
              style={{
                color: '#D4AF37',
              }}
            />

            <h2 className="mt-4 text-lg font-semibold">
              Users
            </h2>

            <p
              className="mt-2 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              View registered users.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/management/advocates')
            }
            className="rounded-2xl border p-6 text-left transition-opacity hover:opacity-85"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <Scale
              size={28}
              style={{
                color: '#D4AF37',
              }}
            />

            <h2 className="mt-4 text-lg font-semibold">
              Advocates
            </h2>

            <p
              className="mt-2 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              View registered advocates.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/management/reports')
            }
            className="rounded-2xl border p-6 text-left transition-opacity hover:opacity-85"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <FileBarChart
              size={28}
              style={{
                color: '#D4AF37',
              }}
            />

            <h2 className="mt-4 text-lg font-semibold">
              Reports
            </h2>

            <p
              className="mt-2 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              View operational and feedback
              reports.
            </p>
          </button>
        </div>
      </section>
    </main>
  )
}