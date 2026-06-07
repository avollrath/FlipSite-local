const apiBase = `${import.meta.env.BASE_URL}api`

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : {
            'Content-Type': 'application/json',
            ...options.headers,
          },
  })

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) {
        message = body.error
      }
    } catch {
      // Keep status fallback.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function apiUrl(path: string) {
  return `${apiBase}${path}`
}

export function localAssetUrl(path: string) {
  if (!path.startsWith('/api/')) {
    return path
  }
  return apiUrl(path.slice('/api'.length))
}
