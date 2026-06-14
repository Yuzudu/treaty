'use client'
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useUserId } from "@/hooks/useUserId"
import { projectsApi } from "../api/projects.api"

export function useCreateProject() {
  const { data: userId } = useUserId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (title: string) => projectsApi.create(userId!, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", userId] })
    },
  })
}
