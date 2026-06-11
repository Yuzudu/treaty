import { useQuery } from "@tanstack/react-query"
import { projectsApi } from "../api/projects.api"

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
    enabled: false, // Enable when auth is wired
  })
}
