'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { createProjectsApi } from '../api/projects.api'

export function useAssetAnnotations(projectId: string, assetId: string) {
  const { data: auth } = useAuth()

  return useQuery({
    queryKey: ['asset-annotations', projectId, assetId],
    queryFn: () => createProjectsApi(auth!.token).listAnnotations(projectId, assetId),
    enabled: Boolean(auth?.token) && Boolean(projectId) && Boolean(assetId),
  })
}
