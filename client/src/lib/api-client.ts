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

  const res = await fetch(`${env.apiUrl}${path}`, {
    ...fetchInit,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...fetchInit.headers,
    },
  })

  if (!res.ok) {
    throw new ApiError(res.status, `API error ${res.status} on ${path}`)
  }

  return res.json() as Promise<T>
}

export const apiClient = {
  health: () => apiFetch<{ status: string }>("/health"),
  // TODO(phase-1): add projects, assets, shareLinks, orders endpoints
}
