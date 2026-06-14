'use client'
import { useQuery } from "@tanstack/react-query"
import { useUserId } from "@/hooks/useUserId"
import { projectsApi } from "../api/projects.api"

export function useProject(id: string) {
  const { data: userId } = useUserId()
  return useQuery({
    queryKey: ["projects", userId, id],
    queryFn: () => projectsApi.get(userId!, id),
    enabled: !!userId && !!id,
  })
}
