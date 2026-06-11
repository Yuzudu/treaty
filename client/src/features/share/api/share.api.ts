import { apiFetch } from "@/lib/api-client"
import type { ShareLink } from "../types"

export const shareApi = {
  getByToken: (token: string) => apiFetch<ShareLink>(`/share-links/${token}`),
  create: (projectId: string) =>
    apiFetch<ShareLink>(`/share-links/projects/${projectId}`, { method: "POST" }),
}
