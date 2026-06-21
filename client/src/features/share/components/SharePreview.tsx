'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectStatus } from '@treaty/shared'
import { ApiError } from '@/lib/api-client'
import { useCheckout } from '@/features/payment'
import { shareApi } from '../api/share.api'

const STALL_MS = 90_000

interface SharePreviewProps {
  token: string
  paying?: boolean
  failed?: boolean
}

export function SharePreview({ token, paying = false, failed = false }: SharePreviewProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    if (!paying) return
    const t = setTimeout(() => setStalled(true), STALL_MS)
    return () => clearTimeout(t)
  }, [paying])

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['share-preview', token],
    queryFn: () => shareApi.getPreview(token),
    retry: false,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status !== ProjectStatus.AWAITING_PAYMENT) return false
      return paying ? 3_000 : 10_000
    },
  })

  const { mutate: checkout, isPending: checkingOut } = useCheckout()

  async function handleDownload(assetId: string) {
    if (downloadingId) return
    setDownloadingId(assetId)
    try {
      const { url } = await shareApi.getDownloadUrl(token, assetId)
      window.open(url, '_blank')
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        toast.error(err.message)
      } else {
        toast.error('Download failed — please try again')
      }
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="aspect-video w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !preview) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Unable to load preview. Please try refreshing.
      </p>
    )
  }

  const isPaid =
    preview.status === ProjectStatus.PAID ||
    preview.status === ProjectStatus.DELIVERED

  const formattedPrice = preview.priceCents
    ? `₱${(preview.priceCents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    : null

  const formattedExpiry = preview.expiresAt
    ? new Date(preview.expiresAt).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{preview.title}</h2>
        {preview.creatorName && (
          <p className="text-sm text-muted-foreground mt-0.5">by {preview.creatorName}</p>
        )}
      </div>

      {isPaid && (
        <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 space-y-0.5">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            Payment received — your files are ready to download
          </p>
          {formattedExpiry && (
            <p className="text-xs text-green-700 dark:text-green-400">
              Available until {formattedExpiry}
            </p>
          )}
        </div>
      )}

      {preview.status === ProjectStatus.AWAITING_PAYMENT && (
        paying ? (
          stalled ? (
            <div className="p-4 rounded-lg border bg-muted/40 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Payment is taking a moment to confirm.</p>
              <p>
                If you completed payment, you&apos;ll get access shortly — you can safely close
                this page and return to this link.
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-border bg-card flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Confirming your payment…</p>
                <p className="text-xs text-muted-foreground mt-0.5">This usually takes a few seconds.</p>
              </div>
            </div>
          )
        ) : (
          formattedPrice && (
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              {failed && (
                <p className="text-xs font-medium text-destructive">
                  Payment didn&apos;t go through — please try again.
                </p>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Pay {formattedPrice} to unlock
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Full-resolution files delivered instantly after payment
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => checkout(token)}
                  disabled={checkingOut}
                  className="w-full sm:w-auto shrink-0"
                >
                  {checkingOut ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Redirecting…</>
                  ) : (
                    `Pay ${formattedPrice}`
                  )}
                </Button>
              </div>
            </div>
          )
        )
      )}

      {preview.status === ProjectStatus.PREVIEW_SHARED && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          Awaiting final pricing from {preview.creatorName ?? 'the creator'}
        </p>
      )}

      {preview.assets.length > 0 ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          onContextMenu={(e) => e.preventDefault()}
        >
          {preview.assets.map((asset) => (
            <div
              key={asset.id}
              className="border border-border rounded-xl overflow-hidden bg-card shadow-sm p-2.5 space-y-2"
            >
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted relative border border-border/40 flex items-center justify-center">
                {!asset.watermarkedUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Processing…</p>
                  </div>
                ) : asset.assetType === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.watermarkedUrl}
                    alt="Watermarked preview"
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
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 px-2 py-0.5 rounded border border-border/20">
                  {asset.assetType}
                </span>
                {isPaid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1.5"
                    disabled={downloadingId === asset.id}
                    onClick={() => handleDownload(asset.id)}
                  >
                    {downloadingId === asset.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {downloadingId === asset.id ? 'Preparing…' : 'Download'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No files yet.</p>
      )}
    </div>
  )
}
