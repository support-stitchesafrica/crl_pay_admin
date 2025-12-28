import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { CreditScoringService } from './credit-scoring.service';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [CustomersModule],
  providers: [CreditService, CreditScoringService],
  controllers: [CreditController],
  exports: [CreditService],
})
export class CreditModule {}
