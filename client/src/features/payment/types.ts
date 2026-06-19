export interface CheckoutSession {
  url: string
}

export interface OnboardingStatus {
  onboarded: boolean
  active: boolean
  status: string | null
}
