import { apiFetch } from "@/lib/api-client"
import type { CheckoutSession, OnboardingStatus } from "../types"

export const paymentApi = {
  createCheckout: (token: string) =>
    apiFetch<CheckoutSession>(`/orders/share/${token}/checkout`, { method: "POST" }),

  onboard: (accessToken: string) =>
    apiFetch<unknown>("/orders/connect/onboard", { method: "POST", accessToken }),

  onboardingStatus: (accessToken: string) =>
    apiFetch<OnboardingStatus>("/orders/connect/status", { accessToken }),
}
