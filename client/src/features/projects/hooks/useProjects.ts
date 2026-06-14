'use client'
import { useQuery } from "@tanstack/react-query"
import { useUserId } from "@/hooks/useUserId"
import { createProjectsApi } from "../api/projects.api"

export function useProjects() {
  const { data: userId } = useUserId()
  return useQuery({
    queryKey: ["projects", userId],
    queryFn: () => createProjectsApi(userId!).list(),
    enabled: !!userId,
    staleTime: 30_000,
  })
}
