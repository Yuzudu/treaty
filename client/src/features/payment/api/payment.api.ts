import { apiFetch } from "@/lib/api-client"
import type { CheckoutSession } from "../types"

export const paymentApi = {
  createCheckout: (projectId: string) =>
    apiFetch<CheckoutSession>(`/orders/projects/${projectId}/checkout`, { method: "POST" }),
}
