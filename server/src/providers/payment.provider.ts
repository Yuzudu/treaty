export interface PaymentProvider {
  createSubAccount(params: {
    email: string;
    name: string;
  }): Promise<{ subAccountId: string }>;

  getSubAccountStatus(subAccountId: string): Promise<{ active: boolean }>;

  createCheckoutSession(params: {
    projectId: string;
    subAccountId: string;
    amountCents: number;
    currency: string;
    platformFeeCents: number;
    shareToken: string;
  }): Promise<{ url: string; externalId: string }>;

  verifyWebhookToken(token: string): boolean;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
