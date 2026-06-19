'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectStatus, ALLOWED_TRANSITIONS } from '@treaty/shared'
import { useProject } from '../hooks/useProject'
import { useTransition } from '../hooks/useTransition'
import { useProjectAssets } from '../hooks/useProjectAssets'
import { StatusBadge } from './StatusBadge'
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'


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
  const { mutate: transition, isPending, variables: pendingVars } = useTransition(id)
  const isProtected = useScreenshotProtection()
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
  const [priceInput, setPriceInput] = useState('')

  if (isLoading) return <ProjectDetailSkeleton />

  if (!project) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Project not found.</div>
  }

  const status = project.status as ProjectStatus
  const nextStatuses = ALLOWED_TRANSITIONS[status] ?? []

  function handleTransition(to: ProjectStatus, priceCents?: number) {
    transition(
      { to, priceCents, currency: priceCents !== undefined ? 'PHP' : undefined },
      { onError: (err) => toast.error((err as Error).message) },
    )
  }

  function handleRequestPayment() {
    const pesos = Number(priceInput)
    if (!priceInput || !Number.isFinite(pesos) || pesos <= 0) {
      toast.error('Enter a valid price')
      return
    }
    handleTransition(ProjectStatus.AWAITING_PAYMENT, Math.round(pesos * 100))
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
          <div className="flex flex-wrap items-center gap-2">
            {nextStatuses.map((next) =>
              next === ProjectStatus.AWAITING_PAYMENT ? (
                <div key={next} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Price (PHP)"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-36"
                  />
                  <Button variant="outline" disabled={isPending} onClick={handleRequestPayment}>
                    {isPending && pendingVars?.to === next && (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    )}
                    Request payment
                  </Button>
                </div>
              ) : (
                <Button
                  key={next}
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleTransition(next)}
                >
                  {isPending && pendingVars?.to === next && (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  )}
                  <StatusBadge status={next} />
                </Button>
              ),
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Assets</h2>
        
        {isProtected ? (
          <div className="flex flex-col items-center justify-center border border-destructive/20 bg-destructive/5 text-destructive p-12 text-center rounded-xl gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            <p className="text-sm font-semibold tracking-tight">Screenshot / Snip Detection Shield Active</p>
            <p className="text-xs text-muted-foreground max-w-sm">Media content is hidden. Please bring focus back to this browser window to resume viewing.</p>
          </div>
        ) : assetsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
          </div>
        ) : !assets || assets.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/5 border border-dashed border-border p-8 text-center rounded-xl">
            No assets uploaded to this project yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5" onContextMenu={(e) => e.preventDefault()}>
            {assets.map((asset: any) => (
              <div
                key={asset.id}
                onClick={() => asset.watermarkedUrl && setSelectedAsset(asset)}
                className="relative group border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-all duration-200 p-2.5 cursor-pointer"
              >
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted relative border border-border/40 flex items-center justify-center p-4">
                  {!asset.watermarkedUrl ? (
                    <div className="flex flex-col items-center justify-center text-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground font-medium">Generating preview...</p>
                    </div>
                  ) : asset.assetType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.watermarkedUrl}
                      alt="Asset preview"
                      className="absolute inset-0 w-full h-full object-contain"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  ) : (
                    <video
                      src={asset.watermarkedUrl}
                      controls
                      className="absolute inset-0 w-full h-full object-contain"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
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

      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-7xl p-6 rounded-2xl border border-border bg-card shadow-lg flex flex-col items-center justify-center gap-4">
          <DialogTitle className="sr-only">Asset Preview</DialogTitle>
          <div className="relative w-full h-[75vh] rounded-xl overflow-hidden bg-muted border border-border/40 flex items-center justify-center">
            {isProtected ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 p-12 text-destructive">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                <p className="text-sm font-semibold tracking-tight">Screenshot / Snip Detection Shield Active</p>
                <p className="text-xs text-muted-foreground">Media content is hidden. Please bring focus back to resume viewing.</p>
              </div>
            ) : selectedAsset ? (
              selectedAsset.assetType === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAsset.watermarkedUrl}
                  alt="Full preview"
                  className="w-full h-full object-contain"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <video
                  src={selectedAsset.watermarkedUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )
            ) : null}
          </div>
          {selectedAsset && (
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 px-2 py-0.5 rounded border border-border/20">
                {selectedAsset.assetType}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
