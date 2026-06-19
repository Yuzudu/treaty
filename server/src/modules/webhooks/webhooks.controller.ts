import { Controller, Post, Body, Headers } from '@nestjs/common';
import {
  WebhooksService,
  XenditWebhookPayload,
  XenditAccountWebhookPayload,
} from './webhooks.service';

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

  @Post('xendit/account')
  xenditAccount(
    @Body() body: XenditAccountWebhookPayload,
    @Headers('x-callback-token') token: string = '',
  ) {
    return this.webhooksService.handleXenditAccountEvent(body, token);
  }
}
