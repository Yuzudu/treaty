import Link from "next/link"
import { SignInForm } from "@/features/auth"

export const metadata = {
  title: "Sign in — Treaty",
}

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back to Treaty.
        </p>
      </div>
      <SignInForm />
      <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
          Create an account
        </Link>
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
          Forgot your password?
        </Link>
      </div>
    </div>
  )
}
