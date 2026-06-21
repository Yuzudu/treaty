'use client'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Share2, Check, Play, MessageSquare, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectStatus, ALLOWED_TRANSITIONS } from '@treaty/shared'
import { useProject } from '../hooks/useProject'
import { useTransition } from '../hooks/useTransition'
import { useProjectAssets } from '../hooks/useProjectAssets'
import { useShareLink } from '../hooks/useShareLink'
import { useAssetAnnotations } from '../hooks/useAssetAnnotations'
import { useProjectAnnotations } from '../hooks/useProjectAnnotations'
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
  const { mutate: generateShareLink, isPending: isSharing } = useShareLink()
  const isProtected = useScreenshotProtection()
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null)
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null)

  // Video player ref for seeking/scrubbing
  const videoRef = useRef<HTMLVideoElement>(null)

  // Fetch annotations left-joined on collaborations, coordinates, and videos
  const { data: creatorAnnotations = [] } = useAssetAnnotations(id, selectedAsset?.id ?? '')

  // Fetch project-wide annotations for feedback feed
  const { data: projectAnnotations = [], refetch: refetchProjectAnnotations } = useProjectAnnotations(id)

  // Seek video once player is mounted after project feed click
  useEffect(() => {
    if (selectedAsset && videoRef.current && pendingSeekTime !== null) {
      videoRef.current.currentTime = pendingSeekTime
      videoRef.current.play().catch(() => {})
      setPendingSeekTime(null)
    }
  }, [selectedAsset, pendingSeekTime])

  const handleFeedCommentClick = (ann: any) => {
    const asset = assets?.find((a: any) => a.id === ann.assetId)
    if (asset) {
      setSelectedAsset(asset)
      setHoveredAnnotationId(ann.id)
      if (ann.video?.timestampSeconds) {
        setPendingSeekTime(parseFloat(ann.video.timestampSeconds))
      }
    }
  }

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

  function handleShare() {
    if (!project) return
    generateShareLink(project.id, {
      onSuccess: (data) => {
        const shareUrl = `${window.location.origin}/share/${data.token}`
        navigator.clipboard.writeText(shareUrl)
        toast.success('Share link copied to clipboard!')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      onError: (err) => {
        toast.error((err as Error).message)
      },
    })
  }

  const formatVideoTime = (secondsStr: string | null) => {
    if (!secondsStr) return ''
    const seconds = parseFloat(secondsStr)
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnnotationClick = (ann: any) => {
    if (ann.video?.timestampSeconds && videoRef.current) {
      videoRef.current.currentTime = parseFloat(ann.video.timestampSeconds)
      videoRef.current.play().catch(() => {})
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <StatusBadge status={status} />
        </div>
        <Button
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center gap-2 self-start sm:self-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow"
        >
          {isSharing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {copied ? 'Link Copied!' : 'Share Preview'}
        </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Assets Grid (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="aspect-video w-full rounded-xl" />
            </div>
          ) : !assets || assets.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted/5 border border-dashed border-border p-8 text-center rounded-xl">
              No assets uploaded to this project yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" onContextMenu={(e) => e.preventDefault()}>
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
                    {asset.commentCount !== undefined && asset.commentCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        <MessageSquare className="h-3 w-3" />
                        {asset.commentCount} {asset.commentCount === 1 ? 'comment' : 'comments'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Project Feedback Feed (1 col) */}
        <div className="lg:col-span-1 border border-border/40 bg-card/45 rounded-2xl flex flex-col h-[60vh] overflow-hidden text-left shadow-sm bg-card">
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>Project Feedback Feed ({projectAnnotations.length})</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {projectAnnotations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2 text-muted-foreground">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
                <p className="text-xs font-semibold">No collaborator comments yet</p>
                <p className="text-[10px] max-w-[180px] text-center leading-relaxed">
                  Send the share preview link to collaborators to start gathering comments and annotations.
                </p>
              </div>
            ) : (
              projectAnnotations.map((ann: any) => {
                const assetIndex = assets?.findIndex((a: any) => a.id === ann.assetId) ?? -1
                const assetLabel = assetIndex !== -1 ? `Asset ${assetIndex + 1}` : 'Asset'

                return (
                  <div
                    key={ann.id}
                    onClick={() => handleFeedCommentClick(ann)}
                    className="group border border-border/60 hover:border-primary/45 p-3 rounded-xl bg-background hover:bg-muted/10 shadow-sm transition-all duration-150 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">
                          {ann.collaboratorName || 'Anonymous'}
                        </span>
                        <span className="text-[9px] text-muted-foreground border border-border px-1 py-0.2 rounded bg-muted/30">
                          {ann.coordinates?.boundingBox ? 'box' : 'pin'}
                        </span>
                      </div>
                      <span className="text-[9px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                        {assetLabel} ({ann.assetType})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {ann.commentText}
                    </p>
                    {ann.video?.timestampSeconds && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded group-hover:bg-primary group-hover:text-primary-foreground transition-colors mt-1.5">
                        <Play className="h-2 w-2 fill-current" />
                        Seek to {formatVideoTime(ann.video.timestampSeconds)}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedAsset} onOpenChange={(open) => {
        if (!open) {
          setSelectedAsset(null)
          setHoveredAnnotationId(null)
          refetchProjectAnnotations()
        }
      }}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-7xl p-6 rounded-2xl border border-border bg-card shadow-lg flex flex-col items-center justify-center gap-4">
          <DialogTitle className="sr-only">Asset Preview</DialogTitle>
          {selectedAsset && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
              {/* Left Column: Asset Media Canvas (2 cols) */}
              <div className="lg:col-span-2 relative w-full h-[70vh] rounded-xl overflow-hidden bg-muted border border-border/40 flex items-center justify-center select-none">
                {isProtected ? (
                  <div className="flex flex-col items-center justify-center text-center gap-2 p-12 text-destructive">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    <p className="text-sm font-semibold tracking-tight">Screenshot / Snip Detection Shield Active</p>
                    <p className="text-xs text-muted-foreground">Media content is hidden. Please bring focus back to resume viewing.</p>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Media content */}
                    {selectedAsset.assetType === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedAsset.watermarkedUrl}
                        alt="Full preview"
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={selectedAsset.watermarkedUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}

                    {/* Render Pins overlay */}
                    {creatorAnnotations.map((ann: any) => {
                      if (!ann.coordinates?.coordX || !ann.coordinates?.coordY || ann.coordinates?.boundingBox) return null
                      const x = parseFloat(ann.coordinates.coordX)
                      const y = parseFloat(ann.coordinates.coordY)

                      return (
                        <div
                          key={ann.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAnnotationClick(ann)
                          }}
                          onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                          onMouseLeave={() => setHoveredAnnotationId(null)}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          className="absolute w-6 h-6 -ml-3 -mt-3 bg-red-500/90 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:scale-125 hover:bg-red-600 transition-all z-10 font-bold text-[10px]"
                        >
                          📌
                          {hoveredAnnotationId === ann.id && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 bg-card border border-border p-2.5 rounded-xl shadow-xl text-left text-xs text-foreground font-normal min-w-[150px] max-w-[240px] pointer-events-none select-none">
                              <div className="font-bold border-b border-border/40 pb-1 mb-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                                {ann.collaboratorName}
                              </div>
                              <div className="break-words leading-relaxed text-muted-foreground font-medium">
                                {ann.commentText}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Render Bounding Box Overlays */}
                    {creatorAnnotations.map((ann: any) => {
                      if (!ann.coordinates?.boundingBox) return null
                      const { x, y, width: w, height: h } = ann.coordinates.boundingBox

                      return (
                        <div
                          key={ann.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAnnotationClick(ann)
                          }}
                          onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                          onMouseLeave={() => setHoveredAnnotationId(null)}
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            width: `${w}%`,
                            height: `${h}%`,
                          }}
                          className="absolute border-2 border-red-500 bg-red-500/10 hover:bg-red-500/25 transition-all cursor-pointer z-10 rounded shadow-sm flex items-center justify-center"
                        >
                          {hoveredAnnotationId === ann.id && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 bg-card border border-border p-2.5 rounded-xl shadow-xl text-left text-xs text-foreground font-normal min-w-[150px] max-w-[240px] pointer-events-none select-none">
                              <div className="font-bold border-b border-border/40 pb-1 mb-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                                {ann.collaboratorName}
                              </div>
                              <div className="break-words leading-relaxed text-muted-foreground font-medium">
                                {ann.commentText}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Feedback List (1 col) */}
              <div className="lg:col-span-1 border border-border/40 bg-card/45 rounded-xl flex flex-col h-[70vh] overflow-hidden text-left">
                <div className="p-4 border-b border-border/40 flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>Collaborator Feedback ({creatorAnnotations.length})</span>
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {creatorAnnotations.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2 text-muted-foreground">
                      <p className="text-xs font-semibold">No feedback comments yet</p>
                      <p className="text-[10px] max-w-[160px] text-center leading-relaxed">
                        Generate and send the share preview link to collaborators to collect comments.
                      </p>
                    </div>
                  ) : (
                    creatorAnnotations.map((ann: any) => (
                      <div
                        key={ann.id}
                        onClick={() => handleAnnotationClick(ann)}
                        className={`group border border-border/60 hover:border-primary/45 p-3 rounded-xl bg-background/90 shadow-sm transition-all duration-150 ${
                          ann.video?.timestampSeconds ? 'cursor-pointer' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">
                              {ann.collaboratorName}
                            </span>
                            <span className="text-[9px] text-muted-foreground border border-border px-1 py-0.2 rounded bg-muted/30">
                              {ann.coordinates?.boundingBox ? 'box' : 'pin'}
                            </span>
                          </div>
                          {ann.video?.timestampSeconds && (
                            <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded flex items-center gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <Play className="h-2.5 w-2.5 fill-current" />
                              {formatVideoTime(ann.video.timestampSeconds)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {ann.commentText}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
