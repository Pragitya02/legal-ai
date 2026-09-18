import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Users,
  Scale,
  LogOut,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

import { clearStoredUser } from '../lib/auth'

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001'

interface AdminUser {
  id?: number | string
  fullName?: string
  full_name?: string
  email?: string
  role?: string
}

interface AdminMeResponse {
  success?: boolean
  user?: AdminUser
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [user, setUser] =
    useState<AdminUser | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [loggingOut, setLoggingOut] =
    useState(false)

  // =====================================================
  // VERIFY ADMIN SESSION
  // =====================================================

  useEffect(() => {
    let cancelled = false

    async function verifyAdmin() {
      try {
        const response = await fetch(
          `${API_URL}/api/admin/me`,
          {
            method: 'GET',
            credentials: 'include',
          },
        )

        if (!response.ok) {
          throw new Error(
            'Administrator session is not valid.',
          )
        }

        const data =
          (await response.json()) as AdminMeResponse

        if (
          !data.success ||
          !data.user ||
          data.user.role !== 'admin'
        ) {
          throw new Error(
            'Administrator access required.',
          )
        }

        if (!cancelled) {
          setUser(data.user)
        }
      } catch (error) {
        console.warn(
          '[ADMIN] Authorization check failed:',
          error,
        )

        clearStoredUser()

        if (!cancelled) {
          navigate('/admin', {
            replace: true,
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void verifyAdmin()

    return () => {
      cancelled = true
    }
  }, [navigate])

  // =====================================================
  // LOGOUT
  // =====================================================

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
    } catch (error) {
      console.warn(
        '[ADMIN] Logout request failed:',
        error,
      )
    } finally {
      clearStoredUser()

      navigate('/admin', {
        replace: true,
      })

      setLoggingOut(false)
    }
  }

  // =====================================================
  // MODULE NAVIGATION
  // =====================================================

  function openUsers() {
    navigate('/admin/users')
  }

  function openAdvocates() {
    navigate('/admin/advocates')
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            size={28}
            className="animate-spin"
            style={{
              color: '#D4AF37',
            }}
          />

          <p
            className="text-sm"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Verifying administrator access...
          </p>
        </div>
      </main>
    )
  }

  const displayName =
    user?.fullName ||
    user?.full_name ||
    'Administrator'

  return (
    <main
      className="min-h-screen"
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          background:
            'color-mix(in srgb, var(--bg) 90%, transparent)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          {/* BRAND */}

          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background:
                  'rgba(212,175,55,0.10)',
                color: '#D4AF37',
              }}
            >
              <Scale size={21} />
            </div>

            <div>
              <p
                className="font-bold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Nyaya
                <span
                  style={{
                    color: '#D4AF37',
                  }}
                >
                  AI
                </span>
              </p>

              <p
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Administrator Portal
              </p>
            </div>
          </div>

          {/* ADMIN ACCOUNT */}

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p
                className="text-sm font-medium"
                style={{
                  color: 'var(--text)',
                }}
              >
                {displayName}
              </p>

              <p
                className="text-xs"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                {user?.email || ''}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-opacity hover:opacity-75 disabled:opacity-50"
              style={{
                border:
                  '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              {loggingOut ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <LogOut size={16} />
              )}

              <span className="hidden sm:inline">
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">

        {/* PAGE INTRO */}

        <section className="mb-10">
          <div className="flex items-start gap-4">
            <div
              className="mt-1 hidden h-14 w-1 rounded-full sm:block"
              style={{
                background: '#D4AF37',
              }}
            />

            <div>
              <p
                className="text-sm font-semibold uppercase tracking-[0.15em]"
                style={{
                  color: '#D4AF37',
                }}
              >
                Administration
              </p>

              <h1
                className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
                style={{
                  color: 'var(--text)',
                }}
              >
                Nyaya AI Admin Portal
              </h1>

              <p
                className="mt-3 max-w-2xl text-sm leading-6"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Manage platform users and advocates
                from one secure administrative workspace.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            TWO MAIN MODULES
        ================================================= */}

        <section>
          <div className="mb-5">
            <h2
              className="text-xl font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Administration
            </h2>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Select a category to inspect and manage
              individual accounts.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            {/* =================================================
                USERS
            ================================================= */}

            <button
              type="button"
              onClick={openUsers}
              className="group rounded-3xl p-7 text-left transition-all duration-200 hover:-translate-y-1"
              style={{
                background: 'var(--bg-card)',
                border:
                  '1px solid var(--border)',
              }}
            >
              <div className="flex items-start justify-between gap-5">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      'rgba(212,175,55,0.10)',
                    color: '#D4AF37',
                  }}
                >
                  <Users size={27} />
                </div>

                <ArrowRight
                  size={21}
                  className="mt-2 transition-transform duration-200 group-hover:translate-x-1"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                />
              </div>

              <h3
                className="mt-7 text-2xl font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Users
              </h3>

              <p
                className="mt-2 max-w-md text-sm leading-6"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                View and inspect registered citizen
                accounts, their profiles, documents,
                activity, security information, and
                individual audit history.
              </p>

              <div
                className="mt-6 flex items-center gap-2 text-sm font-semibold"
                style={{
                  color: '#D4AF37',
                }}
              >
                <span>
                  Manage users
                </span>

                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </button>

            {/* =================================================
                ADVOCATES
            ================================================= */}

            <button
              type="button"
              onClick={openAdvocates}
              className="group rounded-3xl p-7 text-left transition-all duration-200 hover:-translate-y-1"
              style={{
                background: 'var(--bg-card)',
                border:
                  '1px solid var(--border)',
              }}
            >
              <div className="flex items-start justify-between gap-5">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      'rgba(212,175,55,0.10)',
                    color: '#D4AF37',
                  }}
                >
                  <Scale size={27} />
                </div>

                <ArrowRight
                  size={21}
                  className="mt-2 transition-transform duration-200 group-hover:translate-x-1"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                />
              </div>

              <h3
                className="mt-7 text-2xl font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Advocates
              </h3>

              <p
                className="mt-2 max-w-md text-sm leading-6"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                View and inspect advocate accounts,
                professional profiles, documents,
                consultations, activity, security
                information, and individual audit history.
              </p>

              <div
                className="mt-6 flex items-center gap-2 text-sm font-semibold"
                style={{
                  color: '#D4AF37',
                }}
              >
                <span>
                  Manage advocates
                </span>

                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </button>

          </div>
        </section>

        {/* =================================================
            SECURITY NOTICE
        ================================================= */}

        <section
          className="mt-8 rounded-2xl p-5"
          style={{
            background:
              'rgba(212,175,55,0.05)',
            border:
              '1px solid rgba(212,175,55,0.16)',
          }}
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0"
              style={{
                color: '#D4AF37',
              }}
            />

            <div>
              <p
                className="text-sm font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Protected administrator environment
              </p>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Administrator access is verified
                server-side using the administrator
                role. The frontend does not determine
                administrator privileges.
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}