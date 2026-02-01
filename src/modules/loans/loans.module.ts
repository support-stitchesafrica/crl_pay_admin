import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { LoanCalculatorService } from './loan-calculator.service';
import { LiquidationService } from './liquidation.service';
import { InterestAccrualService } from './interest-accrual.service';
import { LoanExpiryService } from './loan-expiry.service';
import { FirebaseModule } from '../../config/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { AllocationsModule } from '../allocations/allocations.module';
import { CapitalModule } from '../capital/capital.module';
import { CreditModule } from '../credit/credit.module';

import { LoanExpiryController } from './loan-expiry.controller';

@Module({
  imports: [FirebaseModule, AuthModule, AllocationsModule, CapitalModule, CreditModule],
  controllers: [LoansController, LoanExpiryController],
  providers: [LoansService, LoanCalculatorService, LiquidationService, InterestAccrualService, LoanExpiryService],
  exports: [LoansService, LoanCalculatorService, LiquidationService, InterestAccrualService],
})
export class LoansModule {}
