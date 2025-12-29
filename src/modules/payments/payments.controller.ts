import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto, RetryPaymentDto, VerifyPaymentDto } from './dto/process-payment.dto';
import { ApiResponse } from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and process a payment' })
  @ApiResponseDecorator({ status: 201, description: 'Payment created successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Bad request' })
  async create(@Body() processPaymentDto: ProcessPaymentDto) {
    try {
      const payment = await this.paymentsService.create(processPaymentDto);
      return ApiResponse.success(payment, 'Payment created successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed payment' })
  @ApiResponseDecorator({ status: 200, description: 'Payment retry initiated' })
  @ApiResponseDecorator({ status: 404, description: 'Payment not found' })
  async retry(@Param('id') id: string) {
    try {
      const payment = await this.paymentsService.retry(id);
      return ApiResponse.success(payment, 'Payment retry initiated');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/generate-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate manual payment link' })
  @ApiResponseDecorator({ status: 200, description: 'Payment link generated' })
  @ApiResponseDecorator({ status: 404, description: 'Payment not found' })
  async generateLink(@Param('id') id: string) {
    try {
      const paymentUrl = await this.paymentsService.generatePaymentLink(id);
      return ApiResponse.success({ paymentUrl }, 'Payment link generated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify payment via Paystack reference' })
  @ApiResponseDecorator({ status: 200, description: 'Payment verified' })
  @ApiResponseDecorator({ status: 404, description: 'Payment not found' })
  async verify(@Query('reference') reference: string) {
    try {
      const payment = await this.paymentsService.verifyPayment(reference);
      return ApiResponse.success(payment, 'Payment verified successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all payments with optional filters' })
  @ApiResponseDecorator({ status: 200, description: 'Payments retrieved successfully' })
  async findAll(
    @Query('loanId') loanId?: string,
    @Query('merchantId') merchantId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: any,
    @Query('limit') limit?: number,
  ) {
    try {
      const payments = await this.paymentsService.findAll({
        loanId,
        merchantId,
        customerId,
        status,
        limit,
      });
      return ApiResponse.success(payments, 'Payments retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponseDecorator({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(
    @Query('merchantId') merchantId?: string,
    @Query('loanId') loanId?: string,
  ) {
    try {
      const stats = await this.paymentsService.getStats({ merchantId, loanId });
      return ApiResponse.success(stats, 'Statistics retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponseDecorator({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: string) {
    try {
      const payment = await this.paymentsService.findOne(id);
      return ApiResponse.success(payment, 'Payment retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
