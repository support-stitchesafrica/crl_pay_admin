import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { ReservationExpiryService } from './reservation-expiry.service';
import { FirebaseModule } from '../../config/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, ReservationExpiryService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
