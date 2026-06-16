'use client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectStatus, ALLOWED_TRANSITIONS } from '@treaty/shared'
import { useProject } from '../hooks/useProject'
import { useTransition } from '../hooks/useTransition'
import { useProjectAssets } from '../hooks/useProjectAssets'
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
  const { data: assets, isLoading: assetsLoading } = useProjectAssets(id)
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

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Assets</h2>
        
        {assetsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
          </div>
        ) : !assets || assets.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/5 border border-dashed border-border p-8 text-center rounded-xl">
            No assets uploaded to this project yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {assets.map((asset: any) => (
              <div key={asset.id} className="relative group border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-all duration-200 p-2.5">
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center relative border border-border/40">
                  {asset.assetType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.watermarkedUrl}
                      alt="Asset preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video
                      src={asset.watermarkedUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 px-2 py-0.5 rounded border border-border/20">
                    {asset.assetType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
