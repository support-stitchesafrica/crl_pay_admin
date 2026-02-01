import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReservationExpiryService } from './reservation-expiry.service';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Checkout - Admin')
@Controller('checkout/reservations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReservationExpiryController {
  constructor(private readonly reservationExpiryService: ReservationExpiryService) {}

  @Post('process-expired')
  @ApiOperation({ summary: 'Manually trigger expired reservations processing (Admin only)' })
  async processExpiredReservations() {
    try {
      await this.reservationExpiryService.handleExpiredReservations();
      return ApiResponse.success(null, 'Expired reservations processing triggered successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
