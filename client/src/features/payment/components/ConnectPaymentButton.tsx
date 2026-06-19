"use client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useOnboard, useOnboardingStatus } from "../hooks/useOnboarding"

const KYC_STEP_MESSAGES: Record<string, string> = {
  INVITED: "Check your email to accept the Xendit invitation.",
  REGISTERED: "Account registered — submit your KYC documents to continue.",
  AWAITING_DOCS: "Xendit is waiting for your documents.",
  PENDING_VERIFICATION: "Xendit is reviewing your account (3–5 business days).",
  SUSPENDED: "Account suspended. Contact Xendit support.",
}

export function ConnectPaymentButton() {
  const { data: status, isLoading } = useOnboardingStatus()
  const onboard = useOnboard()

  if (isLoading) return null

  if (status?.active) {
    return <p className="text-sm text-muted-foreground">Payment account connected.</p>
  }

  if (status?.onboarded && status.status) {
    const message = KYC_STEP_MESSAGES[status.status] ?? "Account pending verification."
    return <p className="text-sm text-muted-foreground">{message}</p>
  }

  return (
    <Button
      variant="outline"
      disabled={onboard.isPending}
      onClick={() => onboard.mutate(undefined, { onError: (err) => toast.error((err as Error).message) })}
    >
      {onboard.isPending ? "Connecting…" : "Connect payment account"}
    </Button>
  )
}
