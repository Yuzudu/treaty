import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { paymentApi } from "../api/payment.api"

export function useOnboardingStatus() {
  const { data: auth } = useAuth()
  return useQuery({
    queryKey: ["onboarding-status", auth?.userId],
    queryFn: () => paymentApi.onboardingStatus(auth!.token),
    enabled: Boolean(auth?.token),
  })
}

export function useOnboard() {
  const { data: auth } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!auth?.token) throw new Error('Not authenticated')
      return paymentApi.onboard(auth.token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status", auth?.userId] })
    },
  })
}
