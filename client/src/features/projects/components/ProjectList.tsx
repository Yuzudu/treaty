'use client'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects } from '../hooks/useProjects'
import { ProjectCard } from './ProjectCard'

export function ProjectList() {
  const { data: projects, isLoading, isError, refetch } = useProjects()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Failed to load projects.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-primary underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!projects?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          No projects yet. Create your first one.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
