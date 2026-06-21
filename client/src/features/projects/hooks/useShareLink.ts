'use client'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { shareApi } from '@/features/share/api/share.api'

export function useShareLink() {
  const { data: auth } = useAuth()

  return useMutation({
    mutationFn: (projectId: string) => shareApi.create(projectId, auth!.token),
  })
}
