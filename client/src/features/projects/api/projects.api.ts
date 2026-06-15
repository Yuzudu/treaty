import { apiFetch } from '@/lib/api-client'
import type { Project } from '../types'
import type { ProjectStatus } from '@treaty/shared'

export function createProjectsApi(token: string) {
  const auth = { accessToken: token }

  return {
    list: () =>
      apiFetch<Project[]>('/projects', auth),

    get: (id: string) =>
      apiFetch<Project>(`/projects/${id}`, auth),

    create: (title: string) =>
      apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ title }),
        ...auth,
      }),

    transition: (id: string, to: ProjectStatus) =>
      apiFetch<Project>(`/projects/${id}/transition`, {
        method: 'PATCH',
        body: JSON.stringify({ to }),
        ...auth,
      }),
  }
}
