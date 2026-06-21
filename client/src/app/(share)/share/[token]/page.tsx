import { notFound } from "next/navigation"
import { validateShareToken, SharePreview, ExpiredLink, RevokedLink } from "@/features/share"

export const dynamic = "force-dynamic"

export const metadata = {
  robots: { index: false, follow: false },
}

interface SharePageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paying?: string; failed?: string }>
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const [{ token }, sp] = await Promise.all([params, searchParams])
  const result = await validateShareToken(token)

  if (result.status === "not-found") {
    notFound()
  }

  if (result.status === "revoked") {
    return <RevokedLink />
  }

  if (result.status === "expired") {
    return <ExpiredLink />
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Project Preview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is a secure, private preview link.
        </p>
      </div>
      <div className="rounded-xl border bg-background p-6">
        <SharePreview token={token} paying={!!sp.paying} failed={!!sp.failed} />
      </div>
    </div>
  )
}
