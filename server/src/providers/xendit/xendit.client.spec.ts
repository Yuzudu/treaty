import { XenditClient } from './xendit.client';

interface CapturedRequestInit {
  method?: string;
  headers: Record<string, string>;
  body: string;
}

describe('XenditClient', () => {
  let client: XenditClient;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    client = new XenditClient('sk_test_123');
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  describe('createSubAccount', () => {
    it('posts to /v2/accounts with basic auth and returns the parsed body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ id: 'acc_123', email: 'creator@example.com' }),
      });

      const result = await client.createSubAccount({
        email: 'creator@example.com',
        businessName: 'Creator Co',
      });

      expect(result).toEqual({ id: 'acc_123', email: 'creator@example.com' });
      const [url, init] = fetchMock.mock.calls[0] as [
        string,
        CapturedRequestInit,
      ];
      expect(url).toBe('https://api.xendit.co/v2/accounts');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe(
        `Basic ${Buffer.from('sk_test_123:').toString('base64')}`,
      );
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('bad request'),
      });

      await expect(
        client.createSubAccount({ email: 'x@example.com', businessName: 'X' }),
      ).rejects.toThrow('Xendit createSubAccount failed: 400 bad request');
    });
  });

  describe('createInvoice', () => {
    it('sends for-user-id header and fees array', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'inv_1',
            invoice_url: 'https://checkout.xendit.co/inv_1',
          }),
      });

      // Inputs are in centavos (minor unit); Xendit expects pesos (major unit)
      const result = await client.createInvoice({
        externalId: 'order_proj-1',
        amount: 50000, // PHP 500.00 in centavos
        currency: 'PHP',
        subAccountId: 'acc_123',
        platformFeeAmount: 500, // PHP 5.00 in centavos
        successRedirectUrl: 'https://app.example.com/success',
        failureRedirectUrl: 'https://app.example.com/failure',
      });

      expect(result).toEqual({
        id: 'inv_1',
        invoice_url: 'https://checkout.xendit.co/inv_1',
      });
      const [, init] = fetchMock.mock.calls[0] as [string, CapturedRequestInit];
      expect(init.headers['for-user-id']).toBe('acc_123');
      const body = JSON.parse(init.body) as {
        amount: number;
        fees: Array<{ type: string; value: number }>;
      };
      expect(body.amount).toBe(500); // PHP 500.00 sent to Xendit
      expect(body.fees).toEqual([{ type: 'PLATFORM_FEE', value: 5 }]); // PHP 5.00
    });
  });

  describe('getSubAccount', () => {
    it('gets account status', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'acc_123', status: 'ACTIVE' }),
      });

      const result = await client.getSubAccount('acc_123');

      expect(result).toEqual({ id: 'acc_123', status: 'ACTIVE' });
      const [url] = fetchMock.mock.calls[0] as [string, CapturedRequestInit];
      expect(url).toBe('https://api.xendit.co/v2/accounts/acc_123');
    });
  });
});
