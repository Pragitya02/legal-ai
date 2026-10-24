import {
  clearCsrfToken,
  startSilentRefresh,
  stopSilentRefresh,
} from './csrf'

// =====================================================
// AUTH HELPERS
// =====================================================
//
// The authentication token itself lives only in an
// HttpOnly cookie set by the backend.
//
// This file NEVER reads or writes the access token.
//
// A small NON-sensitive snapshot of the logged-in user
// is kept in localStorage under the "user" key.
//
// This snapshot is ONLY for UI/routing decisions.
// It does NOT authenticate API requests.
//
// Every protected API request is authorized by the
// HttpOnly authentication cookie and verified by the
// backend.
// =====================================================


export interface StoredUser {
  id?: number | string
  fullName?: string
  full_name?: string
  name?: string
  email?: string
  phone?: string
  role?: string
  [key: string]: unknown
}


const USER_STORAGE_KEY = 'user'


// =====================================================
// GET STORED USER
// =====================================================

export function getStoredUser(): StoredUser | null {

  try {

    const raw =
      localStorage.getItem(
        USER_STORAGE_KEY
      )


    if (
      !raw ||
      raw === 'undefined' ||
      raw === 'null'
    ) {
      return null
    }


    return JSON.parse(
      raw
    ) as StoredUser

  } catch (error) {

    console.error(
      'Invalid user data in localStorage:',
      error
    )

    return null

  }

}


// =====================================================
// STORE USER
// =====================================================
//
// IMPORTANT:
// Call this after a successful login.
//
// This also starts the silent authentication
// refresh timer.
// =====================================================

export function setStoredUser(
  user: StoredUser
): void {

  localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify(user)
  )


  // Start silent access-token refresh.
  //
  // This does NOT reload the browser.
  // It silently renews the HttpOnly access cookie.
  startSilentRefresh()
}


// =====================================================
// CLEAR STORED USER
// =====================================================

export function clearStoredUser(): void {

  localStorage.removeItem(
    USER_STORAGE_KEY
  )


  // Remove any leftover access token from an older
  // version of the application.
  //
  // The current application should NEVER store the
  // authentication token here.
  localStorage.removeItem(
    'token'
  )


  // Stop silent refresh immediately after logout.
  stopSilentRefresh()
}


// =====================================================
// CHECK LOGIN STATE
// =====================================================
//
// This is ONLY a soft client-side check.
//
// It is NOT a security boundary.
//
// A user object in localStorage does NOT prove that
// the authentication cookie is still valid.
//
// The backend remains responsible for authorization.
// =====================================================

export function isLoggedIn(): boolean {

  return !!getStoredUser()

}


// =====================================================
// LOGOUT
// =====================================================
//
// The backend clears the HttpOnly authentication
// cookies and revokes the refresh token.
//
// Then the frontend clears its non-sensitive user
// snapshot and CSRF token.
// =====================================================

export async function logout(
  apiBaseUrl: string
): Promise<void> {

  try {

    await fetch(
      `${apiBaseUrl}/api/auth/logout`,
      {
        method: 'POST',
        credentials: 'include',
      }
    )

  } catch (error) {

    console.error(
      'Logout request failed:',
      error
    )

  } finally {

    // Stop any future silent refresh requests.
    stopSilentRefresh()

    // Clear UI session information.
    clearStoredUser()

    // Clear the in-memory CSRF token.
    clearCsrfToken()

  }

}
