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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { ApiResponse } from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { PaystackService } from './paystack.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paystackService: PaystackService,
  ) {}

  @Post('initialize-authorization')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initialize Paystack authorization for card tokenization (requires API key)' })
  @ApiResponseDecorator({ status: 201, description: 'Authorization initialized successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Bad request' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Invalid API key' })
  async initializeAuthorization(
    @Req() request: any,
    @Body() body: { email: string; amount: number; customerId: string; metadata?: any },
  ) {
    try {
      const merchantId = request.merchant?.merchantId;
      const reference = `AUTH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const authorizationUrl = await this.paystackService.generatePaymentLink({
        email: body.email,
        amount: body.amount * 100, // Convert to kobo
        reference,
        metadata: {
          customerId: body.customerId,
          merchantId,
          purpose: 'card_authorization',
          ...body.metadata,
        },
      });

      return ApiResponse.success(
        {
          authorizationUrl,
          reference,
        },
        'Authorization initialized successfully',
      );
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('verify/:reference')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Paystack transaction and get authorization code (requires API key)' })
  @ApiResponseDecorator({ status: 200, description: 'Transaction verified successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Transaction verification failed' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Invalid API key' })
  async verifyTransaction(@Param('reference') reference: string) {
    try {
      const verification = await this.paystackService.verifyTransaction(reference);

      return ApiResponse.success(
        {
          status: verification.data.status,
          amount: verification.data.amount,
          reference: verification.data.reference,
          authorizationCode: verification.data.authorization?.authorization_code,
          authorization: verification.data.authorization,
          customer: verification.data.customer,
          paidAt: verification.data.paid_at,
        },
        'Transaction verified successfully',
      );
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
