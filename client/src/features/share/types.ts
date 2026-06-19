// Import and re-export share-link types from @treaty/shared once defined
export interface ShareLink {
  token: string
  projectId: string
  expiresAt: string
  projectStatus: string
  priceCents: number | null
  currency: string
}

export type ShareTokenResult =
  | { status: "valid"; shareLink: ShareLink }
  | { status: "expired" }
  | { status: "not-found" }
