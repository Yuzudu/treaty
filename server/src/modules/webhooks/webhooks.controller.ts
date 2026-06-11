import { Controller, Post, RawBodyRequest, Req, Headers } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('stripe')
  stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    // Verify signature before processing
    this.webhooksService.handleStripeEvent(req.rawBody ?? Buffer.alloc(0), signature);
    return { received: true };
  }
}
