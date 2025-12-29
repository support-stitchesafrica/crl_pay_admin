import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDecorator,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  DashboardQueryDto,
  TimeSeriesQueryDto,
  CustomerAnalyticsQueryDto,
  RevenueQueryDto,
} from './dto/analytics.dto';
import { ApiResponse } from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiResponseDecorator({ status: 200, description: 'Dashboard summary retrieved' })
  async getDashboard(@Request() req: any, @Query() query: DashboardQueryDto) {
    try {
      // If not admin, use the merchant's own ID
      const merchantId = query.merchantId || req.user?.merchantId;
      const summary = await this.analyticsService.getDashboardSummary({
        ...query,
        merchantId,
      });
      return ApiResponse.success(summary, 'Dashboard summary retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('loans/distribution')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get loan distribution analytics' })
  @ApiResponseDecorator({ status: 200, description: 'Loan distribution retrieved' })
  async getLoanDistribution(@Request() req: any, @Query('merchantId') merchantId?: string) {
    try {
      const id = merchantId || req.user?.merchantId;
      const distribution = await this.analyticsService.getLoanDistribution(id);
      return ApiResponse.success(distribution, 'Loan distribution retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('time-series')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get time series data for charts' })
  @ApiResponseDecorator({ status: 200, description: 'Time series data retrieved' })
  async getTimeSeries(@Request() req: any, @Query() query: TimeSeriesQueryDto) {
    try {
      const merchantId = query.merchantId || req.user?.merchantId;
      const data = await this.analyticsService.getTimeSeries({
        ...query,
        merchantId,
      });
      return ApiResponse.success(data, 'Time series data retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('customers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer analytics' })
  @ApiResponseDecorator({ status: 200, description: 'Customer analytics retrieved' })
  async getCustomerAnalytics(@Request() req: any, @Query() query: CustomerAnalyticsQueryDto) {
    try {
      const merchantId = query.merchantId || req.user?.merchantId;
      const analytics = await this.analyticsService.getCustomerAnalytics({
        ...query,
        merchantId,
      });
      return ApiResponse.success(analytics, 'Customer analytics retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get revenue breakdown' })
  @ApiResponseDecorator({ status: 200, description: 'Revenue breakdown retrieved' })
  async getRevenueBreakdown(@Request() req: any, @Query() query: RevenueQueryDto) {
    try {
      const merchantId = query.merchantId || req.user?.merchantId;
      const breakdown = await this.analyticsService.getRevenueBreakdown({
        ...query,
        merchantId,
      });
      return ApiResponse.success(breakdown, 'Revenue breakdown retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
