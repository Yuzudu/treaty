'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, Copy, ExternalLink, Check, AlertTriangle, Trash2, Play, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { ProjectStatus } from '@treaty/shared'
import type { Asset } from '../types'
import { useOnboardingStatus } from '@/features/payment'
import { useProject } from '../hooks/useProject'
import { useTransition } from '../hooks/useTransition'
import { useProjectAssets } from '../hooks/useProjectAssets'
import { useAssetAnnotations } from '../hooks/useAssetAnnotations'
import { useProjectAnnotations } from '../hooks/useProjectAnnotations'
import { StatusBadge } from './StatusBadge'
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { createProjectsApi } from '../api/projects.api'

interface Annotation {
  id: string
  assetId: string
  assetType: string
  collaboratorName: string
  commentText: string
  coordinates?: {
    coordX?: string | null
    coordY?: string | null
    boundingBox?: { x: number; y: number; width: number; height: number }
  }
  video?: { timestampSeconds?: string | null }
}

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
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'destructive',
  onConfirm,
  isPending,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'default' | 'destructive'
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ScreenshotShield() {
  return (
    <div className="flex flex-col items-center justify-center border border-destructive/20 bg-destructive/5 text-destructive p-12 text-center rounded-xl gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 animate-pulse">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
      <p className="text-sm font-semibold tracking-tight">Screenshot / Snip Detection Shield Active</p>
      <p className="text-xs text-muted-foreground max-w-sm">Media content is hidden. Please bring focus back to this browser window to resume viewing.</p>
    </div>
  )
}

export function ProjectDetail({ id }: ProjectDetailProps) {
  const { data: project, isLoading } = useProject(id)
  const { data: projectAssets = [], isLoading: assetsLoading } = useProjectAssets(id)
  const { mutate: transition, isPending: transitioning, variables: pendingVars } = useTransition(id)
  const isProtected = useScreenshotProtection()
  const { data: auth } = useAuth()
  const queryClient = useQueryClient()

  const videoRef = useRef<HTMLVideoElement>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null)
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  const [priceOverride, setPriceOverride] = useState<string | null>(null)
  const [confirmShare, setConfirmShare] = useState(false)
  const [confirmReprice, setConfirmReprice] = useState(false)
  const [confirmDraft, setConfirmDraft] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const { data: onboarding } = useOnboardingStatus()
  const { data: creatorAnnotations = [] } = useAssetAnnotations(id, selectedAsset?.id ?? '')
  const { data: projectAnnotations = [], refetch: refetchProjectAnnotations } = useProjectAnnotations(id)

  const priceInput = priceOverride ?? (project?.priceCents ? (project.priceCents / 100).toFixed(2) : '')
  const setPriceInput = (v: string) => setPriceOverride(v)

  useEffect(() => {
    if (selectedAsset && videoRef.current && pendingSeekTime !== null) {
      videoRef.current.currentTime = pendingSeekTime
      videoRef.current.play().catch(() => {})
      setPendingSeekTime(null)
    }
  }, [selectedAsset, pendingSeekTime])

  const handleUpload = useCallback(async (file: File) => {
    if (!auth?.token) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Only image or video files are allowed')
      return
    }
    setUploading(true)
    try {
      await createProjectsApi(auth.token).uploadAsset(id, file)
      await queryClient.invalidateQueries({ queryKey: ['projects', auth.userId, id, 'assets'] })
      toast.success('File uploaded')
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [auth, id, queryClient])

  const formatVideoTime = (secondsStr: string | null) => {
    if (!secondsStr) return ''
    const seconds = parseFloat(secondsStr)
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnnotationClick = (ann: Annotation) => {
    if (ann.video?.timestampSeconds && videoRef.current) {
      videoRef.current.currentTime = parseFloat(ann.video.timestampSeconds)
      videoRef.current.play().catch(() => {})
    }
  }

  const handleFeedCommentClick = (ann: Annotation) => {
    const asset = projectAssets.find((a) => a.id === ann.assetId)
    if (asset) {
      setSelectedAsset(asset)
      setHoveredAnnotationId(ann.id)
      if (ann.video?.timestampSeconds) {
        setPendingSeekTime(parseFloat(ann.video.timestampSeconds))
      }
    }
  }

  if (isLoading) return <ProjectDetailSkeleton />
  if (!project) return <div className="py-12 text-center text-sm text-muted-foreground">Project not found.</div>

  const status = project.status
  const hasAssets = projectAssets.length > 0
  const priceCents = priceInput ? Math.round(parseFloat(priceInput) * 100) : 0
  const validPrice = priceCents > 0

  const shareUrl = project.shareToken
    ? `${window.location.origin}/share/${project.shareToken}`
    : null

  function doTransition(to: ProjectStatus, extra?: { priceCents?: number; currency?: string }) {
    transition({ to, ...extra }, {
      onError: (err) => toast.error((err as Error).message),
    })
  }

  const uploadDropzone = (
    <label
      className="group relative flex flex-col items-center justify-center w-full border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 bg-muted/10 hover:bg-primary/5 rounded-xl cursor-pointer transition-all"
      style={{ height: hasAssets ? '76px' : '140px' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handleUpload(file)
      }}
    >
      {uploading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex items-center gap-2 px-4">
          <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {hasAssets ? 'Add another file' : 'Upload your first file'}
            </p>
            {!hasAssets && <p className="text-xs text-muted-foreground">Images or Videos • Max 200MB</p>}
          </div>
        </div>
      )}
      <input
        type="file"
        accept="image/*,video/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ''
        }}
      />
    </label>
  )

  async function handleDeleteAsset(assetId: string) {
    if (!auth?.token) return
    setDeletingAssetId(assetId)
    try {
      await createProjectsApi(auth.token).deleteAsset(id, assetId)
      await queryClient.invalidateQueries({ queryKey: ['projects', auth.userId, id, 'assets'] })
    } catch (err) {
      toast.error((err as Error).message || 'Delete failed')
    } finally {
      setDeletingAssetId(null)
    }
  }

  const assetGrid = assetsLoading ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <Skeleton className="aspect-video w-full rounded-xl" />
    </div>
  ) : !hasAssets ? null : (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5" onContextMenu={(e) => e.preventDefault()}>
      {projectAssets.map((asset) => (
        <div
          key={asset.id}
          className="relative group border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-all p-2.5"
        >
          <div
            className="aspect-video w-full rounded-lg overflow-hidden bg-muted relative border border-border/40 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => asset.watermarkedUrl && setSelectedAsset(asset)}
          >
            {!asset.watermarkedUrl ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">Generating preview...</p>
              </div>
            ) : asset.assetType === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.watermarkedUrl!} alt="Asset preview" className="absolute inset-0 w-full h-full object-contain" draggable={false} onContextMenu={(e) => e.preventDefault()} />
            ) : (
              <video src={asset.watermarkedUrl!} controls className="absolute inset-0 w-full h-full object-contain" draggable={false} onContextMenu={(e) => e.preventDefault()} />
            )}
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 px-2 py-0.5 rounded border border-border/20">
              {asset.assetType}
            </span>
            {status === ProjectStatus.DRAFT && (
              <button
                onClick={() => handleDeleteAsset(asset.id)}
                disabled={deletingAssetId === asset.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
                title="Delete file"
              >
                {deletingAssetId === asset.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const sectionLabel = (label: string) => (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</h2>
  )

  const cancelButton = (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      disabled={transitioning}
      onClick={() => setConfirmCancel(true)}
    >
      Cancel project
    </Button>
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <StatusBadge status={status} />
      </div>

      {status === ProjectStatus.DRAFT && (
        <>
          <div className="space-y-3">
            {sectionLabel('Files')}
            <div className="space-y-3">
              {uploadDropzone}
              {hasAssets ? (isProtected ? <ScreenshotShield /> : assetGrid) : (
                <p className="text-xs text-muted-foreground text-center py-1">
                  No files yet — upload something to get started.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
            <div className="relative group">
              <Button
                disabled={!hasAssets || transitioning}
                onClick={() => setConfirmShare(true)}
              >
                {transitioning && pendingVars?.to === ProjectStatus.PREVIEW_SHARED
                  ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  : null}
                Share with client
              </Button>
              {!hasAssets && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-foreground text-background rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Upload at least one file first
                </div>
              )}
            </div>
            {cancelButton}
          </div>
        </>
      )}

      {status === ProjectStatus.PREVIEW_SHARED && (
        <>
          {shareUrl ? (
            <div className="space-y-2">
              {sectionLabel('Client preview link')}
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
                <span className="text-sm font-mono truncate flex-1 min-w-0 text-foreground">{shareUrl}</span>
                <CopyButton text={shareUrl} />
                <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link so your client can view the watermarked preview.
              </p>
            </div>
          ) : (
            <p className="text-xs text-destructive">Share link unavailable — try refreshing.</p>
          )}

          <div className="space-y-3">
            {sectionLabel('Files')}
            {isProtected ? <ScreenshotShield /> : assetGrid}
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            {sectionLabel('Request payment')}
            {onboarding && !onboarding.active && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs space-y-0.5">
                {!onboarding.onboarded ? (
                  <>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Connect your payout account to accept payments</p>
                    <p className="text-amber-700 dark:text-amber-400">
                      <a href="/settings" className="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300">Go to Settings → Payments</a> to set up your Xendit account.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Payout account verification in progress</p>
                    <p className="text-amber-700 dark:text-amber-400">
                      Your account is being verified — this usually takes 3–5 business days. Check status in <a href="/settings" className="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300">Settings → Payments</a>.
                    </p>
                  </>
                )}
              </div>
            )}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1.5">
                <label htmlFor="price" className="text-sm font-medium">Price</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground font-medium">₱</span>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-32"
                    disabled={transitioning}
                  />
                </div>
              </div>
              <Button
                disabled={!validPrice || transitioning}
                onClick={() => doTransition(ProjectStatus.AWAITING_PAYMENT, { priceCents, currency: 'PHP' })}
              >
                {transitioning && pendingVars?.to === ProjectStatus.AWAITING_PAYMENT
                  ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  : null}
                Request payment
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={transitioning}
                onClick={() => setConfirmDraft(true)}
              >
                Back to draft
              </Button>
              {cancelButton}
            </div>
          </div>
        </>
      )}

      {status === ProjectStatus.AWAITING_PAYMENT && (
        <>
          <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/20 space-y-1">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Waiting for payment</p>
            {project.priceCents != null && (
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Amount: ₱{(project.priceCents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            )}
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
              Payment link expires in 24 hours. Your client needs to complete payment before you can deliver the files.
            </p>
          </div>
          <div className="space-y-3">
            {sectionLabel('Files')}
            {isProtected ? <ScreenshotShield /> : assetGrid}
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={transitioning}
              onClick={() => setConfirmReprice(true)}
            >
              Back to preview / reprice
            </Button>
            {cancelButton}
          </div>
        </>
      )}

      {status === ProjectStatus.PAID && (
        <>
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Payment received!</p>
            {project.priceCents != null && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                ₱{(project.priceCents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })} collected
              </p>
            )}
          </div>
          <div className="space-y-3">
            {sectionLabel('Files')}
            {isProtected ? <ScreenshotShield /> : assetGrid}
          </div>
          <div className="pt-2 border-t border-border">
            <Button
              onClick={() => doTransition(ProjectStatus.DELIVERED)}
              disabled={transitioning}
            >
              {transitioning && pendingVars?.to === ProjectStatus.DELIVERED
                ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                : null}
              Mark as delivered
            </Button>
          </div>
        </>
      )}

      {status === ProjectStatus.DELIVERED && (
        <>
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Project delivered</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">All done. The client received the final files.</p>
          </div>
          <div className="space-y-3">
            {sectionLabel('Files')}
            {isProtected ? <ScreenshotShield /> : assetGrid}
          </div>
        </>
      )}

      {status === ProjectStatus.EXPIRED && (
        <>
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Payment expired</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">The payment window closed. You can revive this project to try again.</p>
          </div>
          <div className="space-y-3">
            {sectionLabel('Files')}
            {isProtected ? <ScreenshotShield /> : assetGrid}
          </div>
          <div className="pt-2 border-t border-border">
            <Button
              disabled={!hasAssets || transitioning}
              onClick={() => doTransition(ProjectStatus.PREVIEW_SHARED)}
            >
              {transitioning && pendingVars?.to === ProjectStatus.PREVIEW_SHARED
                ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                : null}
              Revive — share again
            </Button>
          </div>
        </>
      )}

      {projectAnnotations.length > 0 && (
        <div className="border border-border/40 bg-card/45 rounded-2xl flex flex-col max-h-80 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>Project Feedback ({projectAnnotations.length})</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {projectAnnotations.map((ann: Annotation) => {
              const assetIndex = projectAssets.findIndex((a) => a.id === ann.assetId)
              const assetLabel = assetIndex !== -1 ? `Asset ${assetIndex + 1}` : 'Asset'
              return (
                <div
                  key={ann.id}
                  onClick={() => handleFeedCommentClick(ann)}
                  className="group border border-border/60 hover:border-primary/45 p-3 rounded-xl bg-background hover:bg-muted/10 shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">
                        {ann.collaboratorName || 'Anonymous'}
                      </span>
                      <span className="text-[9px] text-muted-foreground border border-border px-1 py-0.5 rounded bg-muted/30">
                        {ann.coordinates?.boundingBox ? 'box' : 'pin'}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                      {assetLabel} ({ann.assetType})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed wrap-break-word">
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
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmShare}
        onOpenChange={setConfirmShare}
        title="Share with client?"
        description="This generates a preview link and sends it live. Your client can view the watermarked files immediately."
        confirmLabel="Yes, share"
        confirmVariant="default"
        onConfirm={() => { setConfirmShare(false); doTransition(ProjectStatus.PREVIEW_SHARED) }}
        isPending={transitioning && pendingVars?.to === ProjectStatus.PREVIEW_SHARED}
      />

      <ConfirmDialog
        open={confirmReprice}
        onOpenChange={setConfirmReprice}
        title="Cancel payment link and reprice?"
        description={`This cancels the current ₱${priceInput || '—'} invoice. Your client can't pay at that price anymore. Set a new price when ready.`}
        confirmLabel="Yes, cancel and reprice"
        onConfirm={() => { setConfirmReprice(false); doTransition(ProjectStatus.PREVIEW_SHARED) }}
        isPending={transitioning && pendingVars?.to === ProjectStatus.PREVIEW_SHARED}
      />

      <ConfirmDialog
        open={confirmDraft}
        onOpenChange={setConfirmDraft}
        title="Back to draft?"
        description="This will deactivate the preview link you shared. Anyone who has it will lose access immediately."
        confirmLabel="Yes, back to draft"
        onConfirm={() => { setConfirmDraft(false); doTransition(ProjectStatus.DRAFT) }}
        isPending={transitioning && pendingVars?.to === ProjectStatus.DRAFT}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel project?"
        description="This will expire the project and deactivate any shared link. This cannot be undone."
        confirmLabel="Yes, cancel project"
        onConfirm={() => { setConfirmCancel(false); doTransition(ProjectStatus.EXPIRED) }}
        isPending={transitioning && pendingVars?.to === ProjectStatus.EXPIRED}
      />

      <Dialog open={!!selectedAsset} onOpenChange={(open) => {
        if (!open) {
          setSelectedAsset(null)
          setHoveredAnnotationId(null)
          refetchProjectAnnotations()
        }
      }}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-7xl p-6 rounded-2xl border border-border bg-card shadow-lg flex flex-col items-center justify-center gap-4">
          <DialogTitle className="sr-only">Asset Preview</DialogTitle>
          <DialogDescription className="sr-only">Full-size watermarked preview of the selected file</DialogDescription>
          {selectedAsset && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
              <div className="lg:col-span-2 relative w-full h-[70vh] rounded-xl overflow-hidden bg-muted border border-border/40 flex items-center justify-center select-none">
                {isProtected ? (
                  <ScreenshotShield />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {selectedAsset.assetType === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedAsset.watermarkedUrl!}
                        alt="Full preview"
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={selectedAsset.watermarkedUrl!}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}

                    {creatorAnnotations.map((ann: Annotation) => {
                      if (!ann.coordinates?.coordX || !ann.coordinates?.coordY || ann.coordinates?.boundingBox) return null
                      const x = parseFloat(ann.coordinates.coordX)
                      const y = parseFloat(ann.coordinates.coordY)
                      return (
                        <div
                          key={ann.id}
                          onClick={(e) => { e.stopPropagation(); handleAnnotationClick(ann) }}
                          onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                          onMouseLeave={() => setHoveredAnnotationId(null)}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          className="absolute w-6 h-6 -ml-3 -mt-3 bg-red-500/90 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:scale-125 hover:bg-red-600 transition-all z-10 font-bold text-[10px]"
                        >
                          📌
                          {hoveredAnnotationId === ann.id && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 bg-card border border-border p-2.5 rounded-xl shadow-xl text-left text-xs text-foreground font-normal min-w-37.5 max-w-60 pointer-events-none select-none">
                              <div className="font-bold border-b border-border/40 pb-1 mb-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                                {ann.collaboratorName}
                              </div>
                              <div className="wrap-break-word leading-relaxed text-muted-foreground font-medium">
                                {ann.commentText}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {creatorAnnotations.map((ann: Annotation) => {
                      if (!ann.coordinates?.boundingBox) return null
                      const { x, y, width: w, height: h } = ann.coordinates.boundingBox
                      return (
                        <div
                          key={ann.id}
                          onClick={(e) => { e.stopPropagation(); handleAnnotationClick(ann) }}
                          onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                          onMouseLeave={() => setHoveredAnnotationId(null)}
                          style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
                          className="absolute border-2 border-red-500 bg-red-500/10 hover:bg-red-500/25 transition-all cursor-pointer z-10 rounded shadow-sm flex items-center justify-center"
                        >
                          {hoveredAnnotationId === ann.id && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 bg-card border border-border p-2.5 rounded-xl shadow-xl text-left text-xs text-foreground font-normal min-w-37.5 max-w-60 pointer-events-none select-none">
                              <div className="font-bold border-b border-border/40 pb-1 mb-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                                {ann.collaboratorName}
                              </div>
                              <div className="wrap-break-word leading-relaxed text-muted-foreground font-medium">
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
                      <p className="text-[10px] max-w-40 text-center leading-relaxed">
                        Generate and send the share preview link to collaborators to collect comments.
                      </p>
                    </div>
                  ) : (
                    creatorAnnotations.map((ann: Annotation) => (
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
                            <span className="text-[9px] text-muted-foreground border border-border px-1 py-0.5 rounded bg-muted/30">
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
                        <p className="text-xs text-muted-foreground leading-relaxed wrap-break-word">
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
