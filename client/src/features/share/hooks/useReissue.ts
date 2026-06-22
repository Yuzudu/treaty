'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { shareApi } from '../api/share.api'

export function useReissue(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => shareApi.reissue(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-preview', token] })
    },
  })
}
