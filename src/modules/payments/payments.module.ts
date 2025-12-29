import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { PaymentSchedulerService } from './payment-scheduler.service';
import { FirebaseModule } from '../../config/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [FirebaseModule, AuthModule, LoansModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackService, PaymentSchedulerService],
  exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
