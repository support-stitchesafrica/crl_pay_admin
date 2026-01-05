import { Module } from '@nestjs/common';
import { DisbursementsService } from './disbursements.service';
import { DisbursementsController } from './disbursements.controller';
import { FirebaseModule } from '../../config/firebase.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [FirebaseModule, PaymentsModule],
  controllers: [DisbursementsController],
  providers: [DisbursementsService],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
