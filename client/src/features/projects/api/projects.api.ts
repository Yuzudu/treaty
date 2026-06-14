import { apiFetch } from "@/lib/api-client"
import type { Project } from "../types"
import type { ProjectStatus } from "@treaty/shared"

function authHeaders(userId: string): HeadersInit {
  return { "x-user-id": userId }
}

export function createProjectsApi(userId: string) {
  return {
    list: () =>
      apiFetch<Project[]>("/projects", { headers: authHeaders(userId) }),

    get: (id: string) =>
      apiFetch<Project>(`/projects/${id}`, { headers: authHeaders(userId) }),

    create: (title: string) =>
      apiFetch<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ title }),
        headers: authHeaders(userId),
      }),

    transition: (id: string, to: ProjectStatus) =>
      apiFetch<Project>(`/projects/${id}/transition`, {
        method: "PATCH",
        body: JSON.stringify({ to }),
        headers: authHeaders(userId),
      }),
  }
}
