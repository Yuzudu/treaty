export interface ShareLink {
  token: string
  projectId: string
}

export type ShareTokenResult =
  | { status: "valid"; shareLink: ShareLink }
  | { status: "revoked" }
  | { status: "not-found" }
