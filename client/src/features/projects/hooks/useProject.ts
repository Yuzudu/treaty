'use client'
import { useQuery } from "@tanstack/react-query"
import { useUserId } from "@/hooks/useUserId"
import { createProjectsApi } from "../api/projects.api"

export function useProject(id: string) {
  const { data: userId } = useUserId()
  return useQuery({
    queryKey: ["projects", userId, id],
    queryFn: () => createProjectsApi(userId!).get(id),
    enabled: !!userId && !!id,
    staleTime: 30_000,
  })
}
