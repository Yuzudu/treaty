import { notFound } from "next/navigation"
import { validateShareToken } from "@/features/share"
import { SharePreview } from "@/features/share"
import { ExpiredLink } from "@/features/share"

export const dynamic = "force-dynamic"

export const metadata = {
  robots: { index: false, follow: false },
}

interface SharePageProps {
  params: Promise<{ token: string }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  const result = await validateShareToken(token)

  if (result.status === "not-found") {
    notFound()
  }

  if (result.status === "expired") {
    return <ExpiredLink />
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Project Preview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is a secure, private preview link.
        </p>
      </div>
      <div className="rounded-xl border bg-background p-6">
        <SharePreview shareLink={result.shareLink} />
      </div>
      {/* TODO(phase-1): add annotation tools, payment button */}
    </div>
  )
}
