'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export function useShareAnnotations(token: string, assetId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['share-annotations', token, assetId]

  const query = useQuery({
    queryKey,
    queryFn: () => apiFetch<any[]>(`/share-links/${token}/assets/${assetId}/annotations`),
    enabled: Boolean(token) && Boolean(assetId),
  })

  const mutation = useMutation({
    mutationFn: (dto: {
      collaboratorName: string
      commentText?: string
      coordinates?: {
        coordX?: number | string
        coordY?: number | string
        boundingBox?: any
      }
      video?: {
        timestampSeconds?: number | string
        duration?: number | string
      }
    }) =>
      apiFetch<any>(`/share-links/${token}/assets/${assetId}/annotations`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    ...query,
    addAnnotation: mutation.mutate,
    isAdding: mutation.isPending,
  }
}
