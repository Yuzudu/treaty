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
    throw new ApiError(res.status, `API error ${res.status} on ${path}`)
  }

  return res.json() as Promise<T>
}
export const apiClient = {
  health: () => apiFetch<{ status: string }>("/health"),
}
