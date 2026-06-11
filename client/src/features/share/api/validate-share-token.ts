import { ApiError, apiFetch } from "@/lib/api-client"
import type { ShareLink, ShareTokenResult } from "../types"

export type { ShareTokenResult }

export async function validateShareToken(token: string): Promise<ShareTokenResult> {
  try {
    const shareLink = await apiFetch<ShareLink>(`/share-links/${token}`)

    // Check expiry
    if (new Date(shareLink.expiresAt) < new Date()) {
      return { status: "expired" }
    }

    return { status: "valid", shareLink }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { status: "not-found" }
    }
    // Backend not yet available — stub: return a fixture so the UI renders
    // Remove this stub once the backend share-links endpoint is ready
    const stubShareLink: ShareLink = {
      token,
      projectId: "stub-project-id",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    return { status: "valid", shareLink: stubShareLink }
  }
}
