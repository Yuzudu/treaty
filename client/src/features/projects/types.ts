import type { ProjectStatus } from "@treaty/shared"

export type { ProjectStatus }

export interface Project {
  id: string
  title: string
  status: ProjectStatus
  createdAt: string
}
