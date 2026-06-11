import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  handleStripeEvent(_payload: Buffer, _signature: string): void {
    // Call PaymentProvider.constructWebhookEvent, dispatch on event.type
    this.logger.log('Received Stripe webhook (stub — not yet processed)');
  }
}
