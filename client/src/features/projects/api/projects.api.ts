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

    transition: (id: string, to: ProjectStatus, priceCents?: number, currency?: string) =>
      apiFetch<Project>(`/projects/${id}/transition`, {
        method: 'PATCH',
        body: JSON.stringify({ to, priceCents, currency }),
        ...auth,
      }),

    uploadAsset: (id: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch<any>(`/projects/${id}/assets`, {
        method: 'POST',
        body: formData,
        ...auth,
      })
    },

    listAssets: (id: string) =>
      apiFetch<any[]>(`/projects/${id}/assets`, auth),
  }
}
