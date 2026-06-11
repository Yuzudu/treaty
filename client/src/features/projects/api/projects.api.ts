import { apiFetch } from "@/lib/api-client"
import type { Project } from "../types"

// Align request/response shapes with NestJS DTOs
export const projectsApi = {
  list: () => apiFetch<Project[]>("/projects"),
  get: (id: string) => apiFetch<Project>(`/projects/${id}`),
  create: (body: { title: string }) =>
    apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(body) }),
  transition: (id: string, to: string) =>
    apiFetch<Project>(`/projects/${id}/transition`, {
      method: "PATCH",
      body: JSON.stringify({ to }),
    }),
}
