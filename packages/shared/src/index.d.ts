export declare enum ProjectStatus {
    DRAFT = "DRAFT",
    PREVIEW_SHARED = "PREVIEW_SHARED",
    AWAITING_PAYMENT = "AWAITING_PAYMENT",
    PAID = "PAID",
    DELIVERED = "DELIVERED",
    EXPIRED = "EXPIRED"
}
export declare const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]>;
export declare function canTransition(from: ProjectStatus, to: ProjectStatus): boolean;

export interface ProjectDTO {
  id: string
  title: string
  status: ProjectStatus
  priceCents: number | null
  currency: string | null
  shareToken: string | null
  thumbnailUrl: string | null
  createdAt: string
}

export interface AssetDTO {
  id: string
  assetType: 'image' | 'video'
  fileUrl: string | null
  watermarkedUrl: string | null
  expiresAt: string | null
}

export interface SharePreviewAssetDTO {
  id: string
  assetType: 'image' | 'video'
  watermarkedUrl: string | null
}

export interface SharePreviewDTO {
  status: ProjectStatus
  title: string
  creatorName: string | null
  priceCents: number | null
  currency: string | null
  assets: SharePreviewAssetDTO[]
  expiresAt: string | null
}
