const XENDIT_API_BASE = 'https://api.xendit.co';

export interface XenditSubAccount {
  id: string;
  email: string;
}

export interface XenditSubAccountStatus {
  id: string;
  status: string;
}

export interface XenditInvoice {
  id: string;
  invoice_url: string;
}

export class XenditClient {
  constructor(private readonly secretKey: string) {}

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.secretKey}:`).toString('base64');
  }

  async createSubAccount(params: {
    email: string;
    businessName: string;
  }): Promise<XenditSubAccount> {
    const res = await fetch(`${XENDIT_API_BASE}/v2/accounts`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'MANAGED',
        email: params.email,
        public_profile: { business_name: params.businessName },
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Xendit createSubAccount failed: ${res.status} ${await res.text()}`,
      );
    }
    return res.json() as Promise<XenditSubAccount>;
  }

  async getSubAccount(subAccountId: string): Promise<XenditSubAccountStatus> {
    const res = await fetch(`${XENDIT_API_BASE}/v2/accounts/${subAccountId}`, {
      headers: { Authorization: this.authHeader() },
    });
    if (!res.ok) {
      throw new Error(
        `Xendit getSubAccount failed: ${res.status} ${await res.text()}`,
      );
    }
    return res.json() as Promise<XenditSubAccountStatus>;
  }

  async createInvoice(params: {
    externalId: string;
    amount: number;
    currency: string;
    subAccountId: string;
    platformFeeAmount: number;
    successRedirectUrl: string;
    failureRedirectUrl: string;
  }): Promise<XenditInvoice> {
    const res = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
        'for-user-id': params.subAccountId,
      },
      body: JSON.stringify({
        external_id: params.externalId,
        amount: params.amount,
        currency: params.currency,
        success_redirect_url: params.successRedirectUrl,
        failure_redirect_url: params.failureRedirectUrl,
        fees: [{ type: 'PLATFORM_FEE', value: params.platformFeeAmount }],
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Xendit createInvoice failed: ${res.status} ${await res.text()}`,
      );
    }
    return res.json() as Promise<XenditInvoice>;
  }
}
