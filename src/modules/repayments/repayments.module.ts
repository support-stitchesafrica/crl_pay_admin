import { Module } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { RepaymentsController } from './repayments.controller';
import { RepaymentScheduleService } from './repayment-schedule.service';
import { AutoDebitService } from './auto-debit.service';
import { FirebaseModule } from '../../config/firebase.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [FirebaseModule, WebhooksModule],
  controllers: [RepaymentsController],
  providers: [RepaymentsService, RepaymentScheduleService, AutoDebitService],
  exports: [RepaymentsService, RepaymentScheduleService, AutoDebitService],
})
export class RepaymentsModule {}
