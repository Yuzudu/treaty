import Link from "next/link"

export const metadata = {
  title: "Treaty — Secure file handover for freelance creatives",
  description: "Deliver your work professionally. Share previews, collect payment, release files.",
}

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Deliver creative work with confidence
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
        Treaty lets freelancers share secure previews, collect payment, and release final files —
        all in one professional link.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 transition-opacity"
        >
          Get started free
        </Link>
        <Link
          href="/pricing"
          className="rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          See pricing
        </Link>
      </div>
    </div>
  )
}
