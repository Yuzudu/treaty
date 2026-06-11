import { Injectable } from '@nestjs/common';

export interface PaymentProvider {
  createCheckoutSession(params: {
    projectId: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }>;

  constructWebhookEvent(payload: Buffer, signature: string): unknown;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

// Replace with real Stripe implementation
@Injectable()
export class StubPaymentProvider implements PaymentProvider {
  async createCheckoutSession(params: {
    projectId: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }> {
    return {
      sessionId: `stub_session_${params.projectId}`,
      url: params.successUrl,
    };
  }

  constructWebhookEvent(_payload: Buffer, _signature: string): unknown {
    return { type: 'stub.event', data: {} };
  }
}
