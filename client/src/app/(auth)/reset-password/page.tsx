import { ResetPasswordForm } from "@/features/auth"

export const metadata = {
  title: "New password — Treaty",
}

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password for your account.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  )
}
