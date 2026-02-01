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
import { CheckoutModule } from './modules/checkout/checkout.module';
import { ProviderWebhooksModule } from './modules/provider-webhooks/provider-webhooks.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { RepaymentsModule } from './modules/repayments/repayments.module';
import { AuditModule } from './modules/audit/audit.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CapitalModule } from './modules/capital/capital.module';
import { AllocationsModule } from './modules/allocations/allocations.module';
import { SettlementsModule } from './modules/settlements/settlements.module';

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
    CheckoutModule,
    ProviderWebhooksModule,
    IntegrationsModule,
    RepaymentsModule,
    AuditModule,
    TransactionsModule,
    CapitalModule,
    AllocationsModule,
    SettlementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
