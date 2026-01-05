import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { RepaymentsService } from './repayments.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { FlexibleAuthGuard } from '../auth/guards/flexible-auth.guard';
import { ApiResponse } from '../../common/helpers/response.helper';
import { RecordManualRepaymentDto } from './dto/repayment.dto';

@ApiTags('Repayments')
@Controller('repayments')
@UseGuards(FlexibleAuthGuard)
export class RepaymentsController {
  constructor(private readonly repaymentsService: RepaymentsService) {}

  @Get('schedule/:loanId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get repayment schedule for a loan (JWT or API Key)' })
  @ApiResponseDecorator({ status: 200, description: 'Repayment schedule retrieved' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Provide JWT token or API key' })
  async getSchedule(@Param('loanId') loanId: string) {
    try {
      const schedule = await this.repaymentsService.getScheduleForLoan(loanId);
      return ApiResponse.success(schedule, 'Repayment schedule retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('loan/:loanId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all repayments for a loan (JWT or API Key)' })
  @ApiResponseDecorator({ status: 200, description: 'Repayments retrieved' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Provide JWT token or API key' })
  async getRepayments(@Param('loanId') loanId: string) {
    try {
      const repayments = await this.repaymentsService.getRepaymentsForLoan(loanId);
      return ApiResponse.success(repayments, 'Repayments retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record manual repayment (bank transfer, cash, etc.) (JWT or API Key)' })
  @ApiResponseDecorator({ status: 201, description: 'Manual repayment recorded' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid request' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Provide JWT token or API key' })
  async recordManualRepayment(@Req() request: any, @Body() dto: RecordManualRepaymentDto) {
    try {
      // Extract merchantId from either JWT (request.user) or API Key (request.merchant)
      const merchantId = request.merchant?.merchantId || request.user?.merchantId;
      const repayment = await this.repaymentsService.recordManualRepayment(merchantId, dto);
      return ApiResponse.success(repayment, 'Manual repayment recorded successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
