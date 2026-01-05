import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './config/firebase.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CreditModule } from './modules/credit/credit.module';
import { LoansModule } from './modules/loans/loans.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DefaultsModule } from './modules/defaults/defaults.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FinanciersModule } from './modules/financiers/financiers.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { DisbursementsModule } from './modules/disbursements/disbursements.module';
import { ProviderWebhooksModule } from './modules/provider-webhooks/provider-webhooks.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { RepaymentsModule } from './modules/repayments/repayments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    MerchantsModule,
    AuthModule,
    CustomersModule,
    CreditModule,
    LoansModule,
    PaymentsModule,
    WebhooksModule,
    DefaultsModule,
    AnalyticsModule,
    FinanciersModule,
    CheckoutModule,
    DisbursementsModule,
    ProviderWebhooksModule,
    IntegrationsModule,
    RepaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
