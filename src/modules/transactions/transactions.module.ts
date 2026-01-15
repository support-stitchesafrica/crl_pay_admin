import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { FirebaseModule } from '../../config/firebase.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [FirebaseModule, PaymentsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
