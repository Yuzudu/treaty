'use client'
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ProjectStatus } from "@treaty/shared"
import { useUserId } from "@/hooks/useUserId"
import { createProjectsApi } from "../api/projects.api"

export function useTransition(projectId: string) {
  const { data: userId } = useUserId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (to: ProjectStatus) => createProjectsApi(userId!).transition(projectId, to),
    onSuccess: (updated) => {
      queryClient.setQueryData(["projects", userId, projectId], updated)
      queryClient.invalidateQueries({ queryKey: ["projects", userId] })
    },
  })
}
