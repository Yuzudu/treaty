'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { createProjectsApi } from '../api/projects.api'

export function useProjectAssets(projectId: string) {
  const { data: auth } = useAuth()

  return useQuery({
    queryKey: ['projects', auth?.userId, projectId, 'assets'],
    queryFn: () => createProjectsApi(auth!.token).listAssets(projectId),
    enabled: !!auth && !!projectId,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const data = query?.state?.data as any[] | undefined;
      const hasPending = data?.some((asset: any) => !asset.watermarkedUrl);
      return hasPending ? 2000 : false;
    },
  })
}
