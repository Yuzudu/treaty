import { Global, Module } from '@nestjs/common';
import { PAYMENT_PROVIDER } from './payment.provider';
import { XenditPaymentProvider } from './xendit/xendit-payment.provider';

@Global()
@Module({
  providers: [{ provide: PAYMENT_PROVIDER, useClass: XenditPaymentProvider }],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
