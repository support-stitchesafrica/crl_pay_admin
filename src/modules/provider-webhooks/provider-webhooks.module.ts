import { Module } from '@nestjs/common';
import { ProviderWebhooksService } from './provider-webhooks.service';
import { ProviderWebhooksController } from './provider-webhooks.controller';
import { FirebaseModule } from '../../config/firebase.module';
import { DisbursementsModule } from '../disbursements/disbursements.module';
import { LoansModule } from '../loans/loans.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PaymentsModule } from '../payments/payments.module';
import { RepaymentsModule } from '../repayments/repayments.module';

@Module({
  imports: [
    FirebaseModule,
    DisbursementsModule,
    LoansModule,
    WebhooksModule,
    PaymentsModule,
    RepaymentsModule,
  ],
  controllers: [ProviderWebhooksController],
  providers: [ProviderWebhooksService],
  exports: [ProviderWebhooksService],
})
export class ProviderWebhooksModule {}
