"use client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useCheckout } from "../hooks/useCheckout"

interface PaymentButtonProps {
  token: string
}

export function PaymentButton({ token }: PaymentButtonProps) {
  const checkout = useCheckout()

  return (
    <Button
      onClick={() => checkout.mutate(token, { onError: (err) => toast.error((err as Error).message) })}
      disabled={checkout.isPending}
    >
      {checkout.isPending ? "Redirecting…" : "Pay now"}
    </Button>
  )
}
