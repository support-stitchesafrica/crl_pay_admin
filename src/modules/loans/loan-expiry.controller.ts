import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoanExpiryService } from './loan-expiry.service';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Loans - Admin')
@Controller('loans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoanExpiryController {
  constructor(private readonly loanExpiryService: LoanExpiryService) {}

  @Post('process-expired')
  @ApiOperation({ summary: 'Manually trigger expired pending loans processing (Admin only)' })
  async processExpiredLoans() {
    try {
      await this.loanExpiryService.handleExpiredPendingLoans();
      return ApiResponse.success(null, 'Expired pending loans processing triggered successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
