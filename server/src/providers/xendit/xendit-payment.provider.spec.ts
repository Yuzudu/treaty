import { XenditPaymentProvider } from './xendit-payment.provider';
import type { XenditClient } from './xendit.client';

jest.mock('./xendit.client');

interface MockXenditClient {
  createSubAccount: jest.Mock<
    Promise<{ id: string; email: string }>,
    [{ email: string; businessName: string }]
  >;
  getSubAccount: jest.Mock<Promise<{ id: string; status: string }>, [string]>;
  createInvoice: jest.Mock<
    Promise<{ id: string; invoice_url: string }>,
    [Record<string, unknown>]
  >;
}

describe('XenditPaymentProvider', () => {
  let provider: XenditPaymentProvider;
  let mockClient: MockXenditClient;

  beforeEach(() => {
    process.env.XENDIT_SECRET_KEY = 'sk_test_123';
    process.env.XENDIT_WEBHOOK_TOKEN = 'whtok_123';
    process.env.WEB_URL = 'https://app.example.com';
    mockClient = {
      createSubAccount: jest.fn<
        Promise<{ id: string; email: string }>,
        [{ email: string; businessName: string }]
      >(),
      getSubAccount: jest.fn<
        Promise<{ id: string; status: string }>,
        [string]
      >(),
      createInvoice: jest.fn<
        Promise<{ id: string; invoice_url: string }>,
        [Record<string, unknown>]
      >(),
    };
    provider = new XenditPaymentProvider();
    (provider as unknown as { client: XenditClient }).client =
      mockClient as unknown as XenditClient;
  });

  it('createSubAccount delegates to the client', async () => {
    mockClient.createSubAccount.mockResolvedValue({
      id: 'acc_123',
      email: 'a@b.com',
    });

    const result = await provider.createSubAccount({
      email: 'a@b.com',
      name: 'Creator',
    });

    expect(result).toEqual({ subAccountId: 'acc_123' });
    expect(mockClient.createSubAccount).toHaveBeenCalledWith({
      email: 'a@b.com',
      businessName: 'Creator',
    });
  });

  it('getSubAccountStatus maps ACTIVE to active=true', async () => {
    mockClient.getSubAccount.mockResolvedValue({
      id: 'acc_123',
      status: 'ACTIVE',
    });

    const result = await provider.getSubAccountStatus('acc_123');

    expect(result).toEqual({ active: true });
  });

  it('getSubAccountStatus maps non-ACTIVE to active=false', async () => {
    mockClient.getSubAccount.mockResolvedValue({
      id: 'acc_123',
      status: 'PENDING',
    });

    const result = await provider.getSubAccountStatus('acc_123');

    expect(result).toEqual({ active: false });
  });

  it('createCheckoutSession builds redirect URLs and forwards fee', async () => {
    mockClient.createInvoice.mockResolvedValue({
      id: 'inv_1',
      invoice_url: 'https://checkout.xendit.co/inv_1',
    });

    const result = await provider.createCheckoutSession({
      projectId: 'proj-1',
      subAccountId: 'acc_123',
      amountCents: 50000,
      currency: 'PHP',
      platformFeeCents: 500,
    });

    expect(result).toEqual({
      url: 'https://checkout.xendit.co/inv_1',
      externalId: 'inv_1',
    });
    const callArgs = mockClient.createInvoice.mock.calls[0][0] as unknown as {
      externalId: string;
      amount: number;
      currency: string;
      subAccountId: string;
      platformFeeAmount: number;
      successRedirectUrl: string;
      failureRedirectUrl: string;
    };
    expect(callArgs.externalId).toContain('proj-1');
    expect(callArgs).toMatchObject({
      amount: 50000,
      currency: 'PHP',
      subAccountId: 'acc_123',
      platformFeeAmount: 500,
      successRedirectUrl:
        'https://app.example.com/payment-result?status=success',
      failureRedirectUrl:
        'https://app.example.com/payment-result?status=failure',
    });
  });

  describe('verifyWebhookToken', () => {
    it('returns true for the correct token', () => {
      expect(provider.verifyWebhookToken('whtok_123')).toBe(true);
    });

    it('returns false for an incorrect token', () => {
      expect(provider.verifyWebhookToken('wrong')).toBe(false);
    });
  });
});
