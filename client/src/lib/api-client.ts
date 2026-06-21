import { env } from "./env"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { accessToken?: string },
): Promise<T> {
  const { accessToken, ...fetchInit } = init ?? {}

  const headers: Record<string, string> = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }

  // Only set application/json content-type if not sending FormData
  if (!(fetchInit.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${env.apiUrl}${path}`, {
    ...fetchInit,
    headers: {
      ...headers,
      ...fetchInit.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    let message = `API error ${res.status} on ${path}`
    try {
      const parsed = JSON.parse(body) as { message?: string }
      if (typeof parsed.message === 'string') message = parsed.message
    } catch {}
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}
