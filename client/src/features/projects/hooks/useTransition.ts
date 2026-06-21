'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectStatus } from '@treaty/shared'
import { useAuth } from '@/hooks/useAuth'
import { createProjectsApi } from '../api/projects.api'

export function useTransition(projectId: string) {
  const { data: auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ to, priceCents, currency }: { to: ProjectStatus; priceCents?: number; currency?: string }) =>
      createProjectsApi(auth!.token).transition(projectId, to, priceCents, currency),
    onSuccess: (updated) => {
      queryClient.setQueryData(['projects', auth?.userId, projectId], updated)
      queryClient.invalidateQueries({ queryKey: ['projects', auth?.userId], exact: false })
    },
  })
}
