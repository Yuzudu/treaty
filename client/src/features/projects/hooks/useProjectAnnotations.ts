'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { createProjectsApi } from '../api/projects.api'

export function useProjectAnnotations(projectId: string) {
  const { data: auth } = useAuth()

  return useQuery({
    queryKey: ['project-annotations', projectId],
    queryFn: () => createProjectsApi(auth!.token).listAllAnnotations(projectId),
    enabled: Boolean(auth?.token) && Boolean(projectId),
  })
}
