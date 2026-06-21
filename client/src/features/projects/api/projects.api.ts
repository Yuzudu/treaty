import { apiFetch } from '@/lib/api-client'
import type { ProjectStatus } from '@treaty/shared'
import type { Project, Asset } from '../types'

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
        body: JSON.stringify({ to, ...(priceCents != null && { priceCents, currency: currency ?? 'PHP' }) }),
        ...auth,
      }),

    uploadAsset: (id: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch<Asset>(`/projects/${id}/assets`, {
        method: 'POST',
        body: formData,
        ...auth,
      })
    },

    listAssets: (id: string) =>
      apiFetch<Asset[]>(`/projects/${id}/assets`, auth),

    deleteAsset: (projectId: string, assetId: string) =>
      apiFetch<void>(`/projects/${projectId}/assets/${assetId}`, {
        method: 'DELETE',
        ...auth,
      }),

    listAnnotations: (projectId: string, assetId: string) =>
      apiFetch<any[]>(`/projects/${projectId}/assets/${assetId}/annotations`, auth),

    listAllAnnotations: (projectId: string) =>
      apiFetch<any[]>(`/projects/${projectId}/assets/annotations`, auth),
  }
}
