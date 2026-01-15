import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { CreditScoringService } from './credit-scoring.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { CustomersModule } from '../customers/customers.module';
import { FirebaseModule } from '../../config/firebase.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [FirebaseModule, CustomersModule, VerificationModule],
  controllers: [CreditController],
  providers: [CreditService, CreditScoringService, DuplicateDetectionService],
  exports: [CreditService, CreditScoringService],
})
export class CreditModule {}
