// =====================================================
// CSRF + AUTH SESSION PROTECTION
// =====================================================
//
// Authentication uses HttpOnly cookies.
//
// Access token:
//   Short-lived: 15 minutes
//
// Refresh token:
//   Long-lived: 30 days
//
// This module provides:
//
//   1. CSRF protection
//   2. Automatic silent access-token refresh
//   3. 401 fallback refresh
//   4. Automatic retry of failed requests
//   5. Protection against multiple simultaneous refreshes
//
// IMPORTANT:
// The refresh token is NEVER exposed to JavaScript.
// =====================================================

const CSRF_HEADER_NAME = 'X-CSRF-Token'

const UNSAFE_METHODS = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
])

// =====================================================
// INTERNAL STATE
// =====================================================

let installed = false

let csrfToken: string | null = null

let bootstrapPromise: Promise<string | null> | null = null

// Prevent multiple requests from refreshing the same
// session simultaneously.
let refreshPromise: Promise<boolean> | null = null

// Silent refresh timer.
let refreshTimer: ReturnType<typeof setTimeout> | null = null

// Access token is valid for 15 minutes.
// Refresh it approximately 2 minutes before expiry.
const ACCESS_TOKEN_REFRESH_DELAY = 13 * 60 * 1000


// =====================================================
// GET API ORIGIN
// =====================================================

function getApiOrigin(): string | null {
  const envUrl = import.meta.env.VITE_API_URL

  if (!envUrl) {
    return null
  }

  try {
    return new URL(envUrl).origin
  } catch {
    return null
  }
}


// =====================================================
// CHECK WHETHER URL BELONGS TO OUR BACKEND
// =====================================================

function isProtectedUrl(
  url: string,
  origins: string[]
): boolean {
  try {
    const parsed = new URL(
      url,
      window.location.origin
    )

    return origins.includes(parsed.origin)
  } catch {
    return false
  }
}


// =====================================================
// AUTH ENDPOINTS
// =====================================================
//
// Never automatically refresh authentication endpoints.
//
// For example:
//
// Login → 401
//       ↓
// Do NOT call /refresh
//
// Logout → 401
//        ↓
// Do NOT call /refresh
// =====================================================

function isAuthEndpoint(url: string): boolean {
  try {
    const parsed = new URL(
      url,
      window.location.origin
    )

    const path =
      parsed.pathname.replace(/\/$/, '')

    return (
      path === '/api/auth/login' ||
      path === '/api/auth/advocate-login' ||
      path === '/api/auth/refresh' ||
      path === '/api/auth/logout' ||
      path === '/api/auth/csrf' ||
      path.startsWith('/api/auth/signup') ||
      path.startsWith('/api/auth/password-reset')
    )
  } catch {
    return false
  }
}


// =====================================================
// SESSION EXPIRED
// =====================================================

function markSessionExpired(): void {
  try {
    localStorage.removeItem('user')

    // Remove legacy token if an older version of the
    // application left one behind.
    localStorage.removeItem('token')
  } catch {
    // Ignore localStorage errors.
  }

  csrfToken = null

  stopSilentRefresh()
}


// =====================================================
// CSRF TOKEN
// =====================================================

export async function ensureCsrfToken(
  forceRefresh = false
): Promise<string | null> {

  if (
    csrfToken &&
    !forceRefresh
  ) {
    return csrfToken
  }

  if (
    typeof window === 'undefined'
  ) {
    return null
  }

  const apiOrigin =
    getApiOrigin()

  if (!apiOrigin) {
    return null
  }

  // Prevent duplicate CSRF requests.
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {

    try {

      const response =
        await fetch(
          `${apiOrigin}/api/auth/csrf`,
          {
            method: 'GET',
            credentials: 'include',
          }
        )

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (
        !response.ok ||
        !data?.success ||
        typeof data.csrfToken !== 'string'
      ) {

        console.error(
          '[CSRF] Bootstrap failed:',
          data?.message ||
            response.statusText
        )

        return null
      }

      csrfToken =
        data.csrfToken

      return csrfToken

    } catch (error) {

      console.error(
        '[CSRF] Bootstrap error:',
        error
      )

      return null

    } finally {

      bootstrapPromise = null

    }

  })()

  return bootstrapPromise
}


// =====================================================
// CLEAR CSRF TOKEN
// =====================================================

export function clearCsrfToken(): void {
  csrfToken = null
}


// =====================================================
// REFRESH ACCESS TOKEN
// =====================================================
//
// Uses the HttpOnly refresh cookie.
//
// JavaScript NEVER receives the refresh token.
// =====================================================

async function refreshAccessToken(
  apiOrigin: string
): Promise<boolean> {

  // If another request is already refreshing,
  // wait for that same operation.
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {

    try {

      console.log(
        '[AUTH] Refreshing access token silently...'
      )

      const response =
        await fetch(
          `${apiOrigin}/api/auth/refresh`,
          {
            method: 'POST',
            credentials: 'include',
          }
        )

      // Refresh token is invalid or expired.
      if (!response.ok) {

        console.warn(
          '[AUTH] Refresh failed. Session expired.'
        )

        markSessionExpired()

        return false
      }


      // The backend rotates the CSRF cookie during
      // refresh, so get the new CSRF token.
      const newCsrfToken =
        await ensureCsrfToken(true)


      if (!newCsrfToken) {

        console.warn(
          '[AUTH] CSRF refresh failed.'
        )

        markSessionExpired()

        return false
      }


      console.log(
        '[AUTH] Session refreshed successfully.'
      )

      return true

    } catch (error) {

      console.error(
        '[AUTH] Refresh request failed:',
        error
      )

      markSessionExpired()

      return false

    } finally {

      refreshPromise = null

    }

  })()

  return refreshPromise
}


// =====================================================
// STOP SILENT REFRESH
// =====================================================

export function stopSilentRefresh(): void {

  if (refreshTimer) {

    clearTimeout(
      refreshTimer
    )

    refreshTimer = null
  }
}


// =====================================================
// START / SCHEDULE SILENT REFRESH
// =====================================================
//
// This function should be called after successful login.
//
// It does NOT refresh the browser.
// It only silently renews the HttpOnly access cookie.
// =====================================================

export function startSilentRefresh(): void {

  stopSilentRefresh()

  const apiOrigin =
    getApiOrigin()

  if (!apiOrigin) {
    return
  }

  scheduleSilentRefresh(
    apiOrigin
  )
}


// =====================================================
// SCHEDULE NEXT SILENT REFRESH
// =====================================================

function scheduleSilentRefresh(
  apiOrigin: string
): void {

  stopSilentRefresh()

  refreshTimer =
    setTimeout(
      async () => {

        const refreshed =
          await refreshAccessToken(
            apiOrigin
          )

        if (refreshed) {

          // Schedule another refresh for the next
          // access-token lifetime.
          scheduleSilentRefresh(
            apiOrigin
          )

        }

      },
      ACCESS_TOKEN_REFRESH_DELAY
    )
}


// =====================================================
// INSTALL GLOBAL FETCH PROTECTION
// =====================================================

export function installCsrfProtection(): void {

  if (
    installed ||
    typeof window === 'undefined' ||
    !window.fetch
  ) {
    return
  }

  installed = true


  // ===================================================
  // BACKEND ORIGINS
  // ===================================================

  const protectedOrigins = [

    'http://localhost:5001',

    'http://127.0.0.1:5001',

  ]


  const apiOrigin =
    getApiOrigin()


  if (apiOrigin) {

    protectedOrigins.push(
      apiOrigin
    )

  }


  // ===================================================
  // SAVE ORIGINAL FETCH
  // ===================================================

  const originalFetch =
    window.fetch.bind(window)


  // ===================================================
  // GLOBAL FETCH WRAPPER
  // ===================================================

  window.fetch = async (
    input: RequestInfo | URL,
    init: RequestInit = {}
  ) => {

    const isRequestObject =
      typeof Request !== 'undefined' &&
      input instanceof Request


    const url =
      typeof input === 'string'
        ? input
        : isRequestObject
          ? (input as Request).url
          : String(input)


    const method = (
      init.method ||
      (
        isRequestObject
          ? (input as Request).method
          : 'GET'
      ) ||
      'GET'
    ).toUpperCase()


    const isProtected =
      isProtectedUrl(
        url,
        protectedOrigins
      )


    // =================================================
    // ADD CSRF HEADER
    // =================================================

    if (
      UNSAFE_METHODS.has(method) &&
      isProtected &&
      !isAuthEndpoint(url) &&
      csrfToken
    ) {

      const headers =
        new Headers(
          init.headers ??
          (
            isRequestObject
              ? (input as Request).headers
              : undefined
          )
        )

      headers.set(
        CSRF_HEADER_NAME,
        csrfToken
      )

      init = {
        ...init,
        headers,
      }

    }


    // =================================================
    // FIRST REQUEST
    // =================================================

    let response =
      await originalFetch(
        input,
        init
      )


    // =================================================
    // 401 FALLBACK REFRESH
    // =================================================
    //
    // Normally the proactive 13-minute refresh means
    // the access token won't expire during normal use.
    //
    // But if the browser was sleeping, the timer was
    // delayed, or the token expired for another reason,
    // this catches the 401 and silently refreshes.
    // =================================================

    if (
      response.status === 401 &&
      isProtected &&
      !isAuthEndpoint(url) &&
      apiOrigin
    ) {

      console.log(
        '[AUTH] API returned 401. Attempting silent refresh:',
        url
      )


      const refreshed =
        await refreshAccessToken(
          apiOrigin
        )


      // =================================================
      // RETRY ORIGINAL REQUEST
      // =================================================

      if (refreshed) {

        if (
          UNSAFE_METHODS.has(method)
        ) {

          const headers =
            new Headers(
              init.headers ??
              (
                isRequestObject
                  ? (input as Request).headers
                  : undefined
              )
            )


          if (csrfToken) {

            headers.set(
              CSRF_HEADER_NAME,
              csrfToken
            )

          }


          init = {
            ...init,
            headers,
          }

        }


        // Request objects can only be consumed once.
        // Clone before retrying.
        let retryInput =
          input


        if (isRequestObject) {

          retryInput =
            (input as Request).clone()

        }


        console.log(
          '[AUTH] Retrying request:',
          url
        )


        response =
          await originalFetch(
            retryInput,
            init
          )

      }

    }


    return response

  }

}
