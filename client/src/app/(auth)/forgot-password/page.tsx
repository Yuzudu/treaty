import Link from "next/link"
import { ForgotPasswordForm } from "@/features/auth"

export const metadata = {
  title: "Reset password — Treaty",
}

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
