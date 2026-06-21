import Link from "next/link"

export function RevokedLink() {
  return (
    <div className="text-center space-y-4">
      <div className="text-4xl">🚫</div>
      <h1 className="text-xl font-semibold">Link no longer active</h1>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        The creator has retracted this preview. Please contact them for an updated link.
      </p>
      <Link
        href="/"
        className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Go to Treaty
      </Link>
    </div>
  )
}
