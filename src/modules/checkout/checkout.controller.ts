import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ApiResponse } from '../../common/helpers/response.helper';
import { CheckEligibilityDto } from './dto/eligibility.dto';
import { ReserveAllocationDto } from './dto/reserve.dto';

@ApiTags('Checkout')
@Controller('checkout')
@UseGuards(ApiKeyGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get('eligibility')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check financing eligibility before showing plans' })
  @ApiResponseDecorator({ status: 200, description: 'Eligibility check completed' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Invalid API key' })
  async checkEligibility(@Req() request: any, @Query() dto: CheckEligibilityDto) {
    try {
      const merchantId = request.merchant?.merchantId;
      const result = await this.checkoutService.checkEligibility(merchantId, dto);
      return ApiResponse.success(result, 'Eligibility check completed');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserve allocation for checkout (atomic, idempotent)' })
  @ApiResponseDecorator({ status: 201, description: 'Allocation reserved successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Insufficient allocation or invalid request' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Invalid API key' })
  async reserveAllocation(@Req() request: any, @Body() dto: ReserveAllocationDto) {
    try {
      const merchantId = request.merchant?.merchantId;
      const result = await this.checkoutService.reserveAllocation(merchantId, dto);
      return ApiResponse.success(result, 'Allocation reserved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
