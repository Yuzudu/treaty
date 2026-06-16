import { Controller, Post, Body, Headers } from '@nestjs/common';
import { WebhooksService, XenditWebhookPayload } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('xendit')
  xendit(
    @Body() body: XenditWebhookPayload,
    @Headers('x-callback-token') token: string = '',
  ) {
    return this.webhooksService.handleXenditEvent(body, token);
  }
}
