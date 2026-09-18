import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Activity,
  Blocks,
  FileCheck2,
  FileText,
  LogOut,
  ShieldCheck,
  Users,
  AlertTriangle,
  LockKeyhole,
  Scale,
  Loader2,
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

interface StatCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}

function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-sm"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            {title}
          </p>

          <p
            className="mt-2 text-3xl font-bold"
            style={{
              color: 'var(--text)',
            }}
          >
            {value}
          </p>

          <p
            className="mt-2 text-xs"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            {description}
          </p>
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background:
              'rgba(212,175,55,0.10)',
            color: '#D4AF37',
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

interface SecurityItemProps {
  icon: React.ReactNode
  title: string
  description: string
  status: string
}

function SecurityItem({
  icon,
  title,
  description,
  status,
}: SecurityItemProps) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-4"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          background:
            'rgba(212,175,55,0.08)',
          color: '#D4AF37',
        }}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="font-medium"
          style={{
            color: 'var(--text)',
          }}
        >
          {title}
        </p>

        <p
          className="mt-1 text-xs"
          style={{
            color: 'var(--text-muted)',
          }}
        >
          {description}
        </p>
      </div>

      <span
        className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
        style={{
          background:
            'rgba(16,185,129,0.10)',
          color: '#10B981',
        }}
      >
        {status}
      </span>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [user, setUser] =
    useState<AdminUser | null>(null)

  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

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
          CONTENT
      ================================================= */}

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">

        {/* Welcome */}

        <section className="mb-8">
          <div className="flex items-start gap-4">
            <div
              className="mt-1 hidden h-12 w-1 rounded-full sm:block"
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
                Security & Governance
              </p>

              <h1
                className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
                style={{
                  color: 'var(--text)',
                }}
              >
                Administrator Dashboard
              </h1>

              <p
                className="mt-2 max-w-2xl text-sm leading-6"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Monitor Nyaya AI platform security,
                document integrity, users, and
                administrative activity from one place.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            OVERVIEW CARDS
        ================================================= */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Platform Users"
            value="—"
            description="Connect user analytics next"
            icon={<Users size={21} />}
          />

          <StatCard
            title="Documents"
            value="—"
            description="Connect document analytics next"
            icon={<FileText size={21} />}
          />

          <StatCard
            title="Audit Events"
            value="—"
            description="Audit activity module"
            icon={<Activity size={21} />}
          />

          <StatCard
            title="Blockchain"
            value="Active"
            description="Document integrity layer"
            icon={<Blocks size={21} />}
          />
        </section>

        {/* =================================================
            SECURITY STATUS
        ================================================= */}

        <section className="mt-8">
          <div className="mb-4">
            <h2
              className="text-xl font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Security Status
            </h2>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Current protection layers configured
              for the platform.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <SecurityItem
              icon={<LockKeyhole size={19} />}
              title="Authentication"
              description="JWT sessions with protected cookies"
              status="Enabled"
            />

            <SecurityItem
              icon={<ShieldCheck size={19} />}
              title="Role-Based Access"
              description="Administrator role enforced server-side"
              status="Enabled"
            />

            <SecurityItem
              icon={<FileCheck2 size={19} />}
              title="Document Integrity"
              description="SHA-256 document hashing"
              status="Enabled"
            />

            <SecurityItem
              icon={<Blocks size={19} />}
              title="Blockchain Verification"
              description="Hash anchoring and integrity verification"
              status="Enabled"
            />

            <SecurityItem
              icon={<Activity size={19} />}
              title="Audit Trail"
              description="Administrative and document activity logging"
              status="Enabled"
            />

            <SecurityItem
              icon={<AlertTriangle size={19} />}
              title="Security Monitoring"
              description="Security events and governance controls"
              status="Ready"
            />
          </div>
        </section>

        {/* =================================================
            ADMIN MODULES
        ================================================= */}

        <section className="mt-8">
          <div className="mb-4">
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
              Security and governance modules.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <button
              type="button"
              className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-card)',
                border:
                  '1px solid var(--border)',
              }}
            >
              <Users
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <h3
                className="mt-4 font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                User Management
              </h3>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Review platform users and roles.
              </p>
            </button>

            <button
              type="button"
              className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-card)',
                border:
                  '1px solid var(--border)',
              }}
            >
              <Activity
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <h3
                className="mt-4 font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Audit Trail
              </h3>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Review document and security activity.
              </p>
            </button>

            <button
              type="button"
              className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-card)',
                border:
                  '1px solid var(--border)',
              }}
            >
              <FileCheck2
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <h3
                className="mt-4 font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Document Security
              </h3>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Monitor protected documents and integrity.
              </p>
            </button>

            <button
              type="button"
              className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-card)',
                border:
                  '1px solid var(--border)',
              }}
            >
              <Blocks
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <h3
                className="mt-4 font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Blockchain
              </h3>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Check blockchain registrations and verification.
              </p>
            </button>

            <button
              type="button"
              className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-card)',
                border:
                  '1px solid var(--border)',
              }}
            >
              <ShieldCheck
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <h3
                className="mt-4 font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Security Events
              </h3>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Investigate authentication and security events.
              </p>
            </button>

            <button
              type="button"
              className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-card)',
                border:
                  '1px solid var(--border)',
              }}
            >
              <Scale
                size={22}
                style={{
                  color: '#D4AF37',
                }}
              />

              <h3
                className="mt-4 font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Governance
              </h3>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Administrative controls and platform policies.
              </p>
            </button>

          </div>
        </section>

        {/* =================================================
            ADMIN ACCESS NOTICE
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
                Access to this dashboard is verified
                against the server-side administrator
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