'use client'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { createProjectsApi } from '../api/projects.api'

export function useProjects() {
  const { data: auth } = useAuth()
  return useQuery({
    queryKey: ['projects', auth?.userId],
    queryFn: () => createProjectsApi(auth!.token).list(),
    enabled: !!auth,
    staleTime: 30_000,
  })
}
