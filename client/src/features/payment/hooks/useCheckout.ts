import { useMutation } from "@tanstack/react-query"
import { paymentApi } from "../api/payment.api"

export function useCheckout() {
  return useMutation({
    mutationFn: (token: string) => paymentApi.createCheckout(token),
    onSuccess: (session) => {
      window.location.href = session.url
    },
  })
}
