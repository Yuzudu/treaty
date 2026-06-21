import { ApiError, apiFetch } from "@/lib/api-client"
import type { ShareLink, ShareTokenResult } from "../types"

export type { ShareTokenResult }

export async function validateShareToken(token: string): Promise<ShareTokenResult> {
  try {
    const shareLink = await apiFetch<ShareLink>(`/share-links/${token}`)
    return { status: "valid", shareLink }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { status: "not-found" }
    if (err instanceof ApiError && err.status === 410) return { status: "revoked" }
    throw err
  }
}
