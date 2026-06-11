import Link from "next/link"

export function ExpiredLink() {
  return (
    <div className="text-center space-y-4">
      <div className="text-4xl">🔒</div>
      <h1 className="text-xl font-semibold">This link has expired</h1>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        The share link you followed is no longer active. Please contact the creator for a new link.
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
