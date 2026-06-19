import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../payment.provider';
import { XenditClient } from './xendit.client';
import { timingSafeStringEqual } from '../../common/timing-safe-equal';

@Injectable()
export class XenditPaymentProvider implements PaymentProvider {
  private client: XenditClient | null = null;

  private getClient(): XenditClient {
    if (!this.client) {
      if (!process.env.XENDIT_SECRET_KEY) {
        throw new Error('XENDIT_SECRET_KEY environment variable is not set');
      }
      this.client = new XenditClient(process.env.XENDIT_SECRET_KEY);
    }
    return this.client;
  }

  async createSubAccount(params: {
    email: string;
    name: string;
  }): Promise<{ subAccountId: string }> {
    const account = await this.getClient().createSubAccount({
      email: params.email,
      businessName: params.name,
    });
    return { subAccountId: account.id };
  }

  async getSubAccountStatus(
    subAccountId: string,
  ): Promise<{ active: boolean }> {
    const account = await this.getClient().getSubAccount(subAccountId);
    return { active: account.status === 'ACTIVE' };
  }

  async createCheckoutSession(params: {
    projectId: string;
    subAccountId: string;
    amountCents: number;
    currency: string;
    platformFeeCents: number;
    shareToken: string;
  }): Promise<{ url: string; externalId: string }> {
    if (!process.env.WEB_URL) {
      throw new Error('WEB_URL environment variable is not set');
    }
    const webUrl = process.env.WEB_URL;
    const invoice = await this.getClient().createInvoice({
      externalId: `order_${params.projectId}_${Date.now()}`,
      amount: params.amountCents,
      currency: params.currency,
      subAccountId: params.subAccountId,
      platformFeeAmount: params.platformFeeCents,
      successRedirectUrl: `${webUrl}/payment-result?status=success&token=${params.shareToken}`,
      failureRedirectUrl: `${webUrl}/payment-result?status=failure&token=${params.shareToken}`,
    });
    return { url: invoice.invoice_url, externalId: invoice.id };
  }

  verifyWebhookToken(token: string): boolean {
    if (!process.env.XENDIT_WEBHOOK_TOKEN) {
      throw new Error('XENDIT_WEBHOOK_TOKEN environment variable is not set');
    }
    return timingSafeStringEqual(token, process.env.XENDIT_WEBHOOK_TOKEN);
  }
}
