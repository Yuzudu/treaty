'use client'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export function useShareProject(token: string) {
  return useQuery({
    queryKey: ['share-project', token],
    queryFn: () => apiFetch<any>(`/share-links/${token}/project`),
    enabled: Boolean(token),
  })
}
