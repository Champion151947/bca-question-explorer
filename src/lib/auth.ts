export const AUTH_ENABLED = import.meta.env.VITE_REQUIRE_AUTH === 'true'
export const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/session`, { credentials: 'include' })
    return res.ok
  } catch {
    return false
  }
}

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) return { ok: true }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: data.error || `Failed (${res.status})` }
  } catch {
    return { ok: false, error: 'Network error' }
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' })
  } catch {
    /* ignore */
  }
}
