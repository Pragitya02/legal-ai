import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Scale,
} from 'lucide-react'

import { ensureCsrfToken } from '../lib/csrf'
import {
  setStoredUser,
  type StoredUser,
} from '../lib/auth'

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001'

type AdminUser = StoredUser
interface AdminMeResponse {
  success?: boolean
  user?: AdminUser
}

export default function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const [errorMessage, setErrorMessage] = useState('')

  // =====================================================
  // CHECK EXISTING ADMIN SESSION
  // =====================================================

  useEffect(() => {
    let cancelled = false

    async function checkAdminSession() {
      try {
        const response = await fetch(
          `${API_URL}/api/admin/me`,
          {
            method: 'GET',
            credentials: 'include',
          },
        )

        if (!response.ok) {
          return
        }

        const data =
          (await response.json()) as AdminMeResponse

        if (
          data.success &&
          data.user &&
          data.user.role === 'admin'
        ) {
          setStoredUser(data.user)

          if (!cancelled) {
            navigate('/admin/dashboard', {
              replace: true,
            })
          }
        }
      } catch (error) {
        console.warn(
          '[ADMIN] Session check failed:',
          error,
        )
      } finally {
        if (!cancelled) {
          setCheckingSession(false)
        }
      }
    }

    void checkAdminSession()

    return () => {
      cancelled = true
    }
  }, [navigate])

  // =====================================================
  // ADMIN LOGIN
  // =====================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (loading) {
      return
    }

    setErrorMessage('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setErrorMessage(
        'Please enter your administrator email and password.',
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/api/admin/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          credentials: 'include',

          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        },
      )

      let data: {
        success?: boolean
        message?: string
        user?: AdminUser
      }

      try {
        data = await response.json()
      } catch {
        throw new Error(
          'The server returned an invalid response.',
        )
      }

      if (
        !response.ok ||
        !data.success ||
        !data.user
      ) {
        throw new Error(
          data.message ||
            'Administrator login failed.',
        )
      }

      // Extra client-side sanity check.
      // The backend remains the real security boundary.
      if (data.user.role !== 'admin') {
        throw new Error(
          'Administrator access was not granted.',
        )
      }

      // Store only the non-sensitive UI user snapshot.
      // The actual authentication session remains in
      // the HttpOnly cookie issued by the backend.
      setStoredUser(data.user)

      // Refresh/read the CSRF token after login.
      await ensureCsrfToken(true)

      navigate('/admin/dashboard', {
        replace: true,
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Administrator login failed.',
      )
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // SESSION CHECK SCREEN
  // =====================================================

  if (checkingSession) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{
          background:
            'radial-gradient(circle at 50% 20%, rgba(212,175,55,0.10), transparent 45%), var(--bg)',
          color: 'var(--text)',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background:
                'rgba(212,175,55,0.10)',
              border:
                '1px solid rgba(212,175,55,0.25)',
            }}
          >
            <Loader2
              size={26}
              className="animate-spin"
              style={{
                color: '#D4AF37',
              }}
            />
          </div>

          <p
            className="text-sm"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Checking administrator session...
          </p>
        </div>
      </main>
    )
  }

  // =====================================================
  // LOGIN PAGE
  // =====================================================

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background:
          'radial-gradient(circle at 50% 10%, rgba(212,175,55,0.12), transparent 42%), var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div className="w-full max-w-md">

        {/* =================================================
            BRAND
        ================================================= */}

        <div className="text-center mb-8">

          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.05))',
              border:
                '1px solid rgba(212,175,55,0.35)',
              boxShadow:
                '0 10px 40px rgba(212,175,55,0.10)',
            }}
          >
            <Scale
              size={30}
              strokeWidth={1.8}
              style={{
                color: '#D4AF37',
              }}
            />
          </div>

          <div
            className="text-2xl font-bold tracking-tight"
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
          </div>

          <div
            className="mt-2 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            Administrator Portal
          </div>
        </div>

        {/* =================================================
            LOGIN CARD
        ================================================= */}

        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            background:
              'var(--bg-card)',
            border:
              '1px solid var(--border)',
            boxShadow:
              '0 20px 70px rgba(0,0,0,0.30)',
          }}
        >

          {/* Security indicator */}

          <div
            className="mb-6 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background:
                'rgba(212,175,55,0.07)',
              border:
                '1px solid rgba(212,175,55,0.18)',
            }}
          >
            <ShieldCheck
              size={20}
              style={{
                color: '#D4AF37',
                flexShrink: 0,
              }}
            />

            <div>
              <p
                className="text-sm font-semibold"
                style={{
                  color: 'var(--text)',
                }}
              >
                Restricted access
              </p>

              <p
                className="mt-0.5 text-xs"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Authorized administrators only
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h1
              className="text-xl font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Administrator sign in
            </h1>

            <p
              className="mt-1 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Sign in to manage Nyaya AI security
              and platform operations.
            </p>
          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl px-4 py-3"
              style={{
                background:
                  'rgba(239,68,68,0.08)',
                border:
                  '1px solid rgba(239,68,68,0.22)',
              }}
            >
              <AlertCircle
                size={18}
                style={{
                  color: '#EF4444',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />

              <p
                className="text-sm leading-5"
                style={{
                  color: '#FCA5A5',
                }}
              >
                {errorMessage}
              </p>
            </div>
          )}

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Email */}

            <div>
              <label
                htmlFor="admin-email"
                className="mb-2 block text-sm font-medium"
                style={{
                  color: 'var(--text)',
                }}
              >
                Administrator email
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                />

                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@example.com"
                  disabled={loading}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}

            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-medium"
                style={{
                  color: 'var(--text)',
                }}
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                />

                <input
                  id="admin-password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter administrator password"
                  disabled={loading}
                  className="input pl-10 pr-11"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}

            <button
              type="submit"
              disabled={
                loading ||
                !email.trim() ||
                !password
              }
              className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background:
                  'linear-gradient(135deg, #D4AF37, #F0D878)',
                color: '#111827',
                boxShadow:
                  '0 10px 30px rgba(212,175,55,0.18)',
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in securely

                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>

          {/* =================================================
              SECURITY FOOTER
          ================================================= */}

          <div
            className="mt-7 border-t pt-5"
            style={{
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={16}
                style={{
                  color: '#10B981',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />

              <p
                className="text-xs leading-5"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Administrator authentication uses
                the same secure session infrastructure
                as the main platform. Authentication
                tokens are kept in protected cookies.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            BACK TO NYAYA AI
        ================================================= */}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm transition-opacity hover:opacity-70"
            style={{
              color: 'var(--text-muted)',
            }}
          >
            ← Back to Nyaya AI
          </button>
        </div>

      </div>
    </main>
  )
}