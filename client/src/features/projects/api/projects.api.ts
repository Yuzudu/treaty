import { apiFetch } from "@/lib/api-client"
import type { Project } from "../types"
import type { ProjectStatus } from "@treaty/shared"

function authHeader(userId: string) {
  return { headers: { "x-user-id": userId } }
}

export const projectsApi = {
  list: (userId: string) =>
    apiFetch<Project[]>("/projects", authHeader(userId)),

  get: (userId: string, id: string) =>
    apiFetch<Project>(`/projects/${id}`, authHeader(userId)),

  create: (userId: string, title: string) =>
    apiFetch<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({ title }),
      ...authHeader(userId),
    }),

  transition: (userId: string, id: string, to: ProjectStatus) =>
    apiFetch<Project>(`/projects/${id}/transition`, {
      method: "PATCH",
      body: JSON.stringify({ to }),
      ...authHeader(userId),
    }),
}
