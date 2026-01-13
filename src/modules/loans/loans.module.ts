import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { LoanCalculatorService } from './loan-calculator.service';
import { LiquidationService } from './liquidation.service';
import { InterestAccrualService } from './interest-accrual.service';
import { FirebaseModule } from '../../config/firebase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [LoansController],
  providers: [LoansService, LoanCalculatorService, LiquidationService, InterestAccrualService],
  exports: [LoansService, LoanCalculatorService, LiquidationService, InterestAccrualService],
})
export class LoansModule {}
