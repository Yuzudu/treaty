import { Button } from "@/components/ui/button"
import { useCheckout } from "../hooks/useCheckout"

interface PaymentButtonProps {
  projectId: string
}

export function PaymentButton({ projectId }: PaymentButtonProps) {
  const checkout = useCheckout()

  return (
    <Button
      onClick={() => checkout.mutate(projectId)}
      disabled={checkout.isPending}
    >
      {checkout.isPending ? "Redirecting…" : "Pay now"}
    </Button>
  )
}
