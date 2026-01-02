import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator, ApiBearerAuth } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto, AuthorizeCardDto, RecordPaymentDto } from './dto/update-loan.dto';
import { ApiResponse } from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

@ApiTags('Loans')
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new loan (requires API key)' })
  @ApiResponseDecorator({ status: 201, description: 'Loan created successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Bad request' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Invalid API key' })
  async create(
    @Req() request: any,
    @Body() createLoanDto: CreateLoanDto,
    @Query('merchantInterestRate') merchantInterestRate: number = 15, // Default 15% if not provided
    @Query('merchantPenaltyRate') merchantPenaltyRate: number = 5, // Default 5% penalty if not provided
  ) {
    try {
      // Extract merchantId from authenticated merchant (populated by ApiKeyGuard)
      const merchantId = request.merchant?.merchantId;
      
      // Override merchantId from request body with authenticated merchant
      const loanDto = { ...createLoanDto, merchantId };
      
      const loan = await this.loansService.create(
        loanDto,
        merchantInterestRate,
        merchantPenaltyRate,
      );
      return ApiResponse.success(loan, 'Loan created successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/authorize-card')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authorize card for loan and activate it (requires API key)' })
  @ApiResponseDecorator({ status: 200, description: 'Card authorized successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Invalid API key' })
  @ApiResponseDecorator({ status: 404, description: 'Loan not found' })
  async authorizeCard(@Param('id') id: string, @Body() authorizeCardDto: AuthorizeCardDto) {
    try {
      const loan = await this.loansService.authorizeCard(id, authorizeCardDto);
      return ApiResponse.success(loan, 'Card authorized successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('record-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a payment for a loan installment' })
  @ApiResponseDecorator({ status: 200, description: 'Payment recorded successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Loan or installment not found' })
  async recordPayment(@Body() recordPaymentDto: RecordPaymentDto) {
    try {
      const loan = await this.loansService.recordPayment(recordPaymentDto);
      return ApiResponse.success(loan, 'Payment recorded successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get own loans (Merchant only)' })
  @ApiResponseDecorator({ status: 200, description: 'Loans retrieved successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async getMyLoans(
    @Request() req: any,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    try {
      const merchantId = req.user?.sub || req.user?.merchantId;

      if (!merchantId) {
        throw new Error('Merchant ID not found in token');
      }

      const loans = await this.loansService.findAll({
        merchantId,
        customerId,
        status,
        limit,
      });
      return ApiResponse.success(loans, 'Loans retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get own loan statistics (Merchant only)' })
  @ApiResponseDecorator({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async getMyStats(@Request() req: any) {
    try {
      const merchantId = req.user?.sub || req.user?.merchantId;

      if (!merchantId) {
        throw new Error('Merchant ID not found in token');
      }

      const stats = await this.loansService.getMerchantStats(merchantId);
      return ApiResponse.success(stats, 'Statistics retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all loans with optional filters (Admin/Financier)' })
  @ApiResponseDecorator({ status: 200, description: 'Loans retrieved successfully' })
  async findAll(
    @Query('merchantId') merchantId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    try {
      const loans = await this.loansService.findAll({
        merchantId,
        customerId,
        status,
        limit,
      });
      return ApiResponse.success(loans, 'Loans retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('merchant/:merchantId/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get loan statistics for a merchant (Admin/Financier)' })
  @ApiResponseDecorator({ status: 200, description: 'Statistics retrieved successfully' })
  async getMerchantStats(@Param('merchantId') merchantId: string) {
    try {
      const stats = await this.loansService.getMerchantStats(merchantId);
      return ApiResponse.success(stats, 'Statistics retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get loan by ID' })
  @ApiResponseDecorator({ status: 200, description: 'Loan retrieved successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Loan not found' })
  async findOne(@Param('id') id: string) {
    try {
      const loan = await this.loansService.findOne(id);
      return ApiResponse.success(loan, 'Loan retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update loan' })
  @ApiResponseDecorator({ status: 200, description: 'Loan updated successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Loan not found' })
  async update(@Param('id') id: string, @Body() updateLoanDto: UpdateLoanDto) {
    try {
      const loan = await this.loansService.update(id, updateLoanDto);
      return ApiResponse.success(loan, 'Loan updated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending loan' })
  @ApiResponseDecorator({ status: 200, description: 'Loan cancelled successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Cannot cancel loan' })
  async cancel(@Param('id') id: string) {
    try {
      const loan = await this.loansService.cancel(id);
      return ApiResponse.success(loan, 'Loan cancelled successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
