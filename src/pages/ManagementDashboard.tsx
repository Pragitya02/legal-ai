import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router'

import {
  Users,
  Scale,
  FileBarChart,
  LogOut,
  Loader2,
  UserCheck,
  ClipboardList,
  MessageSquare,
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

interface UsersResponse {
  success?: boolean
  users?: unknown[]
}

interface AdvocatesResponse {
  success?: boolean
  advocates?: unknown[]
}

interface ReportsResponse {
  success?: boolean
  summary?: {
    totalReports?: number
    openReports?: number
    resolvedReports?: number
    totalFeedback?: number
    averageRating?: number
  }
}

interface DashboardStats {
  totalUsers: number
  totalAdvocates: number
  totalReports: number
  openReports: number
  resolvedReports: number
  totalFeedback: number
  averageRating: number
}

export default function ManagementDashboard() {
  const navigate = useNavigate()

  const [user, setUser] =
    useState<ManagementUser | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [loggingOut, setLoggingOut] =
    useState(false)

  const [stats, setStats] =
    useState<DashboardStats>({
      totalUsers: 0,
      totalAdvocates: 0,
      totalReports: 0,
      openReports: 0,
      resolvedReports: 0,
      totalFeedback: 0,
      averageRating: 0,
    })

  const [statsLoading, setStatsLoading] =
    useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadManagementDashboard() {
      try {
        setLoading(true)

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

        /*
         * Load dashboard statistics after
         * management authentication succeeds.
         *
         * These are all read-only endpoints.
         */
        await loadDashboardStats()
      } catch (error) {
        console.error(
          '[MANAGEMENT DASHBOARD]',
          error,
        )

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

    async function loadDashboardStats() {
      try {
        setStatsLoading(true)

        const [
          usersResponse,
          advocatesResponse,
          reportsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/management/users?limit=100`,
            {
              method: 'GET',
              credentials: 'include',
            },
          ),

          fetch(
            `${API_URL}/api/management/advocates?limit=100`,
            {
              method: 'GET',
              credentials: 'include',
            },
          ),

          fetch(
            `${API_URL}/api/management/reports?limit=1`,
            {
              method: 'GET',
              credentials: 'include',
            },
          ),
        ])

        /*
         * If one of the statistic requests fails,
         * do not log the management user out.
         * The main management session is still valid.
         */

        let totalUsers = 0
        let totalAdvocates = 0

        let reportSummary: ReportsResponse['summary'] =
          undefined

        if (usersResponse.ok) {
          const usersData =
            (await usersResponse.json()) as UsersResponse

          if (
            usersData.success &&
            Array.isArray(usersData.users)
          ) {
            totalUsers =
              usersData.users.length
          }
        }

        if (advocatesResponse.ok) {
          const advocatesData =
            (await advocatesResponse.json()) as AdvocatesResponse

          if (
            advocatesData.success &&
            Array.isArray(
              advocatesData.advocates,
            )
          ) {
            totalAdvocates =
              advocatesData.advocates.length
          }
        }

        if (reportsResponse.ok) {
          const reportsData =
            (await reportsResponse.json()) as ReportsResponse

          if (reportsData.success) {
            reportSummary =
              reportsData.summary
          }
        }

        if (!cancelled) {
          setStats({
            totalUsers,
            totalAdvocates,

            totalReports:
              Number(
                reportSummary?.totalReports || 0,
              ),

            openReports:
              Number(
                reportSummary?.openReports || 0,
              ),

            resolvedReports:
              Number(
                reportSummary?.resolvedReports || 0,
              ),

            totalFeedback:
              Number(
                reportSummary?.totalFeedback || 0,
              ),

            averageRating:
              Number(
                reportSummary?.averageRating || 0,
              ),
          })
        }
      } catch (error) {
        console.error(
          '[MANAGEMENT DASHBOARD STATS]',
          error,
        )
      } finally {
        if (!cancelled) {
          setStatsLoading(false)
        }
      }
    }

    void loadManagementDashboard()

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
    } catch (error) {
      console.error(
        '[MANAGEMENT LOGOUT]',
        error,
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
        className="flex min-h-screen items-center justify-center"
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
        }}
      >
        <Loader2
          size={30}
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
      {/* =====================================================
          HEADER
      ===================================================== */}

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
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              borderColor: 'var(--border)',
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

            {loggingOut
              ? 'Logging out...'
              : 'Logout'}
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p
            className="text-sm"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Signed in as{' '}
            <span
              style={{
                color: 'var(--text)',
              }}
            >
              {user?.email}
            </span>
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Management Overview
          </h2>

          <p
            className="mt-2 max-w-2xl text-sm"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Monitor registered users, advocates,
            reports and consultation feedback.
            Management access is read-only.
          </p>
        </div>

        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* USERS */}

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <div className="flex items-center justify-between">
              <Users
                size={25}
                style={{
                  color: '#D4AF37',
                }}
              />

              <span
                className="text-xs"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Registered
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold">
              {statsLoading ? (
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{
                    color: '#D4AF37',
                  }}
                />
              ) : (
                stats.totalUsers
              )}
            </p>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Total Users
            </p>
          </div>

          {/* ADVOCATES */}

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <div className="flex items-center justify-between">
              <Scale
                size={25}
                style={{
                  color: '#D4AF37',
                }}
              />

              <span
                className="text-xs"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Registered
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold">
              {statsLoading ? (
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{
                    color: '#D4AF37',
                  }}
                />
              ) : (
                stats.totalAdvocates
              )}
            </p>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Total Advocates
            </p>
          </div>

          {/* REPORTS */}

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <div className="flex items-center justify-between">
              <FileBarChart
                size={25}
                style={{
                  color: '#D4AF37',
                }}
              />

              <span
                className="text-xs"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Reports
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold">
              {statsLoading ? (
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{
                    color: '#D4AF37',
                  }}
                />
              ) : (
                stats.totalReports
              )}
            </p>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Total Reports
            </p>
          </div>

          {/* FEEDBACK */}

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <div className="flex items-center justify-between">
              <MessageSquare
                size={25}
                style={{
                  color: '#D4AF37',
                }}
              />

              <span
                className="text-xs"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Consultations
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold">
              {statsLoading ? (
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{
                    color: '#D4AF37',
                  }}
                />
              ) : (
                stats.totalFeedback
              )}
            </p>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Feedback Entries
            </p>
          </div>
        </div>

        {/* =====================================================
            OPERATIONAL SUMMARY
        ===================================================== */}

        <div className="mb-10 grid gap-4 md:grid-cols-3">
          {/* OPEN REPORTS */}

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <div className="flex items-center gap-3">
              <ClipboardList
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <div>
                <p className="text-sm font-semibold">
                  Open Reports
                </p>

                <p
                  className="mt-1 text-xs"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                >
                  Reports currently requiring
                  attention
                </p>
              </div>
            </div>

            <p className="mt-5 text-2xl font-bold">
              {statsLoading ? (
                <Loader2
                  size={22}
                  className="animate-spin"
                  style={{
                    color: '#D4AF37',
                  }}
                />
              ) : (
                stats.openReports
              )}
            </p>
          </div>

          {/* RESOLVED REPORTS */}

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <div className="flex items-center gap-3">
              <UserCheck
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <div>
                <p className="text-sm font-semibold">
                  Resolved Reports
                </p>

                <p
                  className="mt-1 text-xs"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                >
                  Reports marked as resolved
                </p>
              </div>
            </div>

            <p className="mt-5 text-2xl font-bold">
              {statsLoading ? (
                <Loader2
                  size={22}
                  className="animate-spin"
                  style={{
                    color: '#D4AF37',
                  }}
                />
              ) : (
                stats.resolvedReports
              )}
            </p>
          </div>

          {/* RATING */}

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <div className="flex items-center gap-3">
              <MessageSquare
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <div>
                <p className="text-sm font-semibold">
                  Average Feedback Rating
                </p>

                <p
                  className="mt-1 text-xs"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                >
                  Based on submitted consultation
                  feedback
                </p>
              </div>
            </div>

            <p className="mt-5 text-2xl font-bold">
              {statsLoading
                ? '...'
                : stats.averageRating > 0
                  ? `${stats.averageRating.toFixed(1)} / 5`
                  : '—'}
            </p>
          </div>
        </div>

        {/* =====================================================
            MANAGEMENT MODULES
        ===================================================== */}

        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            Management Modules
          </h3>

          <p
            className="mt-1 text-sm"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Open a module to view detailed operational
            information.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {/* USERS */}

          <button
            type="button"
            onClick={() =>
              navigate('/management/users')
            }
            className="rounded-2xl border p-6 text-left transition-all hover:-translate-y-0.5 hover:opacity-85"
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
              View registered citizen accounts,
              contact information and registration
              dates.
            </p>

            <p
              className="mt-4 text-xs font-semibold"
              style={{
                color: '#D4AF37',
              }}
            >
              View Users →
            </p>
          </button>

          {/* ADVOCATES */}

          <button
            type="button"
            onClick={() =>
              navigate('/management/advocates')
            }
            className="rounded-2xl border p-6 text-left transition-all hover:-translate-y-0.5 hover:opacity-85"
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
              View registered advocate profiles,
              professional information and
              verification status.
            </p>

            <p
              className="mt-4 text-xs font-semibold"
              style={{
                color: '#D4AF37',
              }}
            >
              View Advocates →
            </p>
          </button>

          {/* CONSULTATIONS */}

          <button
            type="button"
            onClick={() =>
              navigate('/management/consultations')
            }
            className="rounded-2xl border p-6 text-left transition-all hover:-translate-y-0.5 hover:opacity-85"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <MessageSquare
              size={28}
              style={{
                color: '#D4AF37',
              }}
            />

            <h2 className="mt-4 text-lg font-semibold">
              Consultations
            </h2>

            <p
              className="mt-2 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              View consultation appointments, participants,
              schedules and operational status.
            </p>

            <p
              className="mt-4 text-xs font-semibold"
              style={{
                color: '#D4AF37',
              }}
            >
              View Consultations →
            </p>
          </button>

          {/* REPORTS */}

          <button
            type="button"
            onClick={() =>
              navigate('/management/reports')
            }
            className="rounded-2xl border p-6 text-left transition-all hover:-translate-y-0.5 hover:opacity-85"
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
              View operational reports, feedback
              categories and consultation-related
              issues.
            </p>

            <p
              className="mt-4 text-xs font-semibold"
              style={{
                color: '#D4AF37',
              }}
            >
              View Reports →
            </p>
          </button>
        </div>

        {/* =====================================================
            READ-ONLY NOTICE
        ===================================================== */}

        <div
          className="mt-8 rounded-2xl border px-5 py-4"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--card)',
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{
              color: 'var(--text)',
            }}
          >
            Management Access
          </p>

          <p
            className="mt-1 text-xs leading-5"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            This portal is intended for operational
            monitoring and reporting. Management access
            is read-only and does not provide system
            administration or destructive actions.
          </p>
        </div>
      </section>
    </main>
  )
}