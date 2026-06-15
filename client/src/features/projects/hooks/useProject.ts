'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { createProjectsApi } from '../api/projects.api'

export function useProject(id: string) {
  const { data: auth } = useAuth()
  return useQuery({
    queryKey: ['projects', auth?.userId, id],
    queryFn: () => createProjectsApi(auth!.token).get(id),
    enabled: !!auth && !!id,
    staleTime: 30_000,
  })
}
