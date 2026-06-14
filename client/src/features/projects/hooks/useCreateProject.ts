'use client'
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ProjectStatus } from "@treaty/shared"
import { useUserId } from "@/hooks/useUserId"
import { createProjectsApi } from "../api/projects.api"
import type { Project } from "../types"

export function useCreateProject() {
  const { data: userId } = useUserId()
  const queryClient = useQueryClient()
  const listKey = ["projects", userId]

  return useMutation({
    mutationFn: (title: string) => createProjectsApi(userId!).create(title),
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<Project[]>(listKey)
      const optimistic: Project = {
        id: `optimistic-${Date.now()}`,
        title,
        status: ProjectStatus.DRAFT,
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Project[]>(listKey, (old) => [optimistic, ...(old ?? [])])
      return { previous }
    },
    onError: (_err, _title, context) => {
      queryClient.setQueryData(listKey, context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}
