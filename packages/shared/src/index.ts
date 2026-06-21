export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PREVIEW_SHARED = 'PREVIEW_SHARED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAID = 'PAID',
  DELIVERED = 'DELIVERED',
  EXPIRED = 'EXPIRED',
}

export const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]: [ProjectStatus.PREVIEW_SHARED, ProjectStatus.EXPIRED],
  [ProjectStatus.PREVIEW_SHARED]: [ProjectStatus.DRAFT, ProjectStatus.AWAITING_PAYMENT, ProjectStatus.EXPIRED],
  [ProjectStatus.AWAITING_PAYMENT]: [ProjectStatus.PREVIEW_SHARED, ProjectStatus.PAID, ProjectStatus.EXPIRED],
  [ProjectStatus.PAID]: [ProjectStatus.DELIVERED],
  [ProjectStatus.DELIVERED]: [],
  [ProjectStatus.EXPIRED]: [ProjectStatus.PREVIEW_SHARED],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

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
