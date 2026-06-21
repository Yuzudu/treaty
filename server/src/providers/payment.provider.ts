export interface PaymentProvider {
  createSubAccount(params: {
    email: string;
    name: string;
  }): Promise<{ subAccountId: string }>;

  getSubAccountStatus(subAccountId: string): Promise<{ active: boolean }>;

  createCheckoutSession(params: {
    projectId: string;
    token: string;
    subAccountId: string;
    amountCents: number;
    currency: string;
    platformFeeCents: number;
  }): Promise<{ url: string; externalId: string }>;

  expireInvoice(invoiceId: string): Promise<void>;
  verifyWebhookToken(token: string): boolean;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
