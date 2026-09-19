import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
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

interface ManagementMeResponse {
  success?: boolean
  user?: StoredUser
}

export default function ManagementLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkManagementSession() {
      try {
        const response = await fetch(
          `${API_URL}/api/management/me`,
          {
            method: 'GET',
            credentials: 'include',
          },
        )

        if (!response.ok) {
          return
        }

        const data =
          (await response.json()) as ManagementMeResponse

        if (
          data.success &&
          data.user &&
          data.user.role === 'management'
        ) {
          setStoredUser(data.user)

          if (!cancelled) {
            navigate('/management', {
              replace: true,
            })
          }
        }
      } catch (error) {
        console.warn(
          '[MANAGEMENT] Session check failed:',
          error,
        )
      } finally {
        if (!cancelled) {
          setCheckingSession(false)
        }
      }
    }

    void checkManagementSession()

    return () => {
      cancelled = true
    }
  }, [navigate])

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
        'Please enter your management email and password.',
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/api/management/login`,
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
        user?: StoredUser
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
            'Management login failed.',
        )
      }

      if (data.user.role !== 'management') {
        throw new Error(
          'Management access was not granted.',
        )
      }

      setStoredUser(data.user)

      await ensureCsrfToken(true)

      navigate('/management', {
        replace: true,
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Management login failed.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
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
          style={{ color: '#D4AF37' }}
        />
      </main>
    )
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(circle at 50% 20%, rgba(212,175,55,0.10), transparent 45%), var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl border p-8 shadow-2xl"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="mb-8 text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: 'rgba(212,175,55,0.10)',
                color: '#D4AF37',
              }}
            >
              <Scale size={28} />
            </div>

            <h1 className="text-2xl font-bold">
              Nyaya<span style={{ color: '#D4AF37' }}>AI</span>
            </h1>

            <p
              className="mt-2 text-sm"
              style={{
                color: 'var(--text-muted)',
              }}
            >
              Management Login
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">
                Email
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
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  className="w-full rounded-xl border py-3 pl-10 pr-4 outline-none"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="Management email"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
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
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className="w-full rounded-xl border py-3 pl-10 pr-12 outline-none"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="Password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2"
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

            {errorMessage && (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{
                  borderColor:
                    'rgba(220,80,80,0.35)',
                  color: '#dc5050',
                  background:
                    'rgba(220,80,80,0.06)',
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition disabled:opacity-60"
              style={{
                background: '#D4AF37',
                color: '#111',
              }}
            >
              {loading && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              {loading
                ? 'Signing in...'
                : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}