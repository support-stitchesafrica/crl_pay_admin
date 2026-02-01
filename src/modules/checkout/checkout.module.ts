import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { ReservationExpiryService } from './reservation-expiry.service';
import { ReservationExpiryController } from './reservation-expiry.controller';
import { FirebaseModule } from '../../config/firebase.module';
import { AllocationsModule } from '../allocations/allocations.module';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [FirebaseModule, AllocationsModule, LoansModule],
  controllers: [CheckoutController, ReservationExpiryController],
  providers: [CheckoutService, ReservationExpiryService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
