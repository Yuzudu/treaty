import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdersService {
  createCheckout(_projectId: string) {
    // Call PaymentProvider.createCheckoutSession
    return { url: 'https://checkout.stripe.com/stub', sessionId: 'stub' };
  }

  findOne(_id: string) {
    // Query order from DB
    return { id: _id };
  }
}
