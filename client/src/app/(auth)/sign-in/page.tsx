import { SignInForm } from "@/features/auth"

export const metadata = {
  title: "Sign in — Treaty",
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back to Treaty.
        </p>
      </div>
      <SignInForm searchParams={searchParams} />
    </div>
  )
}
