import { apiFetch } from "@/lib/api-client"
import type { Annotation } from "../types"

// Implement annotation CRUD
export const annotationsApi = {
  list: (assetId: string) => apiFetch<Annotation[]>(`/assets/${assetId}/annotations`),
}
