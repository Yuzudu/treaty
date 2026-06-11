import Link from "next/link"
import { SignUpForm } from "@/features/auth"

export const metadata = {
  title: "Create account — Treaty",
}

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start delivering files professionally.
        </p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  )
}
