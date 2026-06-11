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
  [ProjectStatus.PREVIEW_SHARED]: [ProjectStatus.AWAITING_PAYMENT, ProjectStatus.EXPIRED],
  [ProjectStatus.AWAITING_PAYMENT]: [ProjectStatus.PAID, ProjectStatus.EXPIRED],
  [ProjectStatus.PAID]: [ProjectStatus.DELIVERED],
  [ProjectStatus.DELIVERED]: [],
  [ProjectStatus.EXPIRED]: [],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
