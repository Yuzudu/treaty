'use client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectStatus, ALLOWED_TRANSITIONS } from '@treaty/shared'
import { useProject } from '../hooks/useProject'
import { useTransition } from '../hooks/useTransition'
import { StatusBadge } from './StatusBadge'

interface ProjectDetailProps {
  id: string
}

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  )
}

export function ProjectDetail({ id }: ProjectDetailProps) {
  const { data: project, isLoading } = useProject(id)
  const { mutate: transition, isPending, variables: pendingTo } = useTransition(id)

  if (isLoading) return <ProjectDetailSkeleton />

  if (!project) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Project not found.</div>
  }

  const status = project.status as ProjectStatus
  const nextStatuses = ALLOWED_TRANSITIONS[status] ?? []

  function handleTransition(to: ProjectStatus) {
    transition(to, {
      onError: (err) => toast.error((err as Error).message),
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <StatusBadge status={status} />
      </div>

      {nextStatuses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Move to</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((next) => (
              <Button
                key={next}
                variant="outline"
                disabled={isPending}
                onClick={() => handleTransition(next)}
              >
                {isPending && pendingTo === next && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                )}
                <StatusBadge status={next} />
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Assets</h2>
        <p className="text-sm text-muted-foreground">No assets yet.</p>
      </div>
    </div>
  )
}
