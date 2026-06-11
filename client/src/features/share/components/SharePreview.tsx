import type { ShareLink } from "../types"

interface SharePreviewProps {
  shareLink: ShareLink
}

export function SharePreview({ shareLink }: SharePreviewProps) {
  return (
    <div className="space-y-2">
      {/* Render watermarked asset preview */}
      <p className="text-muted-foreground text-sm">
        Project:{" "}
        <span className="font-mono text-xs">{shareLink.projectId}</span>
      </p>
      <p className="text-muted-foreground text-xs">
        Expires: {new Date(shareLink.expiresAt).toLocaleString()}
      </p>
    </div>
  )
}
