import { useEffect, useState } from 'react'

// =====================================================
// PROFILE PHOTO HELPERS
// =====================================================
//
// The backend returns photo URLs as paths such as
//   /api/profile/photo/12?v=<id>
// The photo itself is stored in private Supabase Storage and
// is only ever read through the backend.
// =====================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export function resolvePhotoUrl(photoUrl?: string | null): string {
  if (!photoUrl) {
    return ''
  }

  if (/^https?:\/\//i.test(photoUrl)) {
    return photoUrl
  }

  return `${API_URL}${photoUrl}`
}

// -----------------------------------------------------
// Upload a captured JPEG for the logged-in user.
// The backend identifies the user from the HttpOnly cookie;
// no user id is sent. The global fetch wrapper adds the CSRF
// header automatically for this PUT request.
// -----------------------------------------------------

export async function uploadProfilePhoto(
  photo: Blob
): Promise<{ photoUrl: string; user: any }> {
  const form = new FormData()

  form.append('photo', photo, 'profile-photo.jpg')

  const response = await fetch(`${API_URL}/api/profile/photo`, {
    method: 'PUT',
    credentials: 'include',
    body: form,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || 'Failed to save profile photo.'
    )
  }

  return {
    photoUrl: data.photoUrl || data.user?.photoUrl || '',
    user: data.user,
  }
}

// -----------------------------------------------------
// Remove the logged-in user's saved photo. The backend
// deletes the stored object and clears the database
// reference; the user is identified from the cookie.
// -----------------------------------------------------

export async function deleteProfilePhoto(): Promise<void> {
  const response = await fetch(`${API_URL}/api/profile/photo`, {
    method: 'DELETE',
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || 'Failed to remove profile photo.'
    )
  }
}

// -----------------------------------------------------
// Load a photo with the login cookie and expose it as an
// object URL. Needed for the user's own photo because
// citizen photos are private (an <img> tag alone would not
// reliably send the cross-site auth cookie).
// Returns '' while loading, when there is no photo, or if
// loading fails, so callers can fall back to initials.
// -----------------------------------------------------

export function useAuthedPhotoSrc(photoUrl?: string | null): string {
  const [src, setSrc] = useState('')

  useEffect(() => {
    const target = resolvePhotoUrl(photoUrl)

    if (!target) {
      setSrc('')
      return
    }

    let cancelled = false
    let objectUrl = ''

    fetch(target, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return response.blob()
      })
      .then((blob) => {
        if (cancelled) {
          return
        }

        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) {
          setSrc('')
        }
      })

    return () => {
      cancelled = true

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [photoUrl])

  return src
}
