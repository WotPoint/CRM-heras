const BASE_URL = 'http://localhost:3001'

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('crm-auth')
    return stored ? (JSON.parse(stored)?.state?.token ?? null) : null
  } catch {
    return null
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    if (res.status === 401) {
      localStorage.removeItem('crm-auth')
      window.location.href = '/login'
    }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}
