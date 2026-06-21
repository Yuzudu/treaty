import { apiFetch } from "@/lib/api-client"
import type { ShareLink } from "../types"
import type { SharePreviewDTO } from "@treaty/shared"

export const shareApi = {
  getByToken: (token: string) => apiFetch<ShareLink>(`/share-links/${token}`),
  create: (projectId: string, accessToken: string) =>
    apiFetch<ShareLink>(`/share-links/projects/${projectId}`, {
      method: "POST",
      accessToken,
    }),
  getPreview: (token: string) =>
    apiFetch<SharePreviewDTO>(`/share-links/${token}/preview`),
  getDownloadUrl: (token: string, assetId: string) =>
    apiFetch<{ url: string }>(`/share-links/${token}/assets/${assetId}/download`),
}
