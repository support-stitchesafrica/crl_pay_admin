import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { LoanCalculatorService } from './loan-calculator.service';
import { LiquidationService } from './liquidation.service';
import { FirebaseModule } from '../../config/firebase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [LoansController],
  providers: [LoansService, LoanCalculatorService, LiquidationService],
  exports: [LoansService, LoanCalculatorService, LiquidationService],
})
export class LoansModule {}
