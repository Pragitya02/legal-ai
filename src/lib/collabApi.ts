const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Cookie auth + CSRF are handled by the existing global fetch wrapper (lib/csrf.ts).
export async function collabFetch<T = any>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/collab${path}`, {
    method: init.method || 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || 'Request failed.')
  }
  return data as T
}

export const API_ORIGIN = API_BASE

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending request',
  active: 'Active',
  declined: 'Declined',
  ended_by_user: 'Collaboration ended',
}
