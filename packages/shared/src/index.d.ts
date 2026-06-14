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
