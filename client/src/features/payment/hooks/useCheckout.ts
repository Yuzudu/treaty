import { useMutation } from "@tanstack/react-query"
import { paymentApi } from "../api/payment.api"

export function useCheckout() {
  return useMutation({
    mutationFn: (projectId: string) => paymentApi.createCheckout(projectId),
    onSuccess: (session) => {
      // Redirect to session.url (Stripe hosted checkout)
      console.log("Checkout session created:", session.sessionId)
    },
  })
}
