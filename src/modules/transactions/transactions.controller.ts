import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all transactions (Admin only)' })
  async getAllTransactions(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('merchantId') merchantId?: string,
    @Query('loanId') loanId?: string,
    @Query('limit') limit?: string,
  ) {
    const transactions = await this.transactionsService.getAllTransactions({
      type,
      status,
      merchantId,
      loanId,
      limit: limit ? parseInt(limit) : 100,
    });
    return ApiResponse.success(
      transactions,
      'Transactions retrieved successfully',
    );
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async getTransactionById(@Param('transactionId') transactionId: string) {
    const transaction =
      await this.transactionsService.getTransactionById(transactionId);
    return ApiResponse.success(
      transaction,
      'Transaction retrieved successfully',
    );
  }

  @Post(':transactionId/requery')
  @ApiOperation({ summary: 'Requery/verify transaction status' })
  async requeryTransaction(
    @Param('transactionId') transactionId: string,
    @Body() body: { provider?: string },
  ) {
    const result = await this.transactionsService.requeryTransaction(
      transactionId,
      body.provider,
    );
    return ApiResponse.success(result, 'Transaction requeried successfully');
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Get transactions by merchant' })
  async getTransactionsByMerchant(
    @Param('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    const transactions =
      await this.transactionsService.getTransactionsByMerchant(
        merchantId,
        limit ? parseInt(limit) : 50,
      );
    return ApiResponse.success(
      transactions,
      'Merchant transactions retrieved successfully',
    );
  }

  @Get('loan/:loanId')
  @ApiOperation({ summary: 'Get transactions by loan' })
  async getTransactionsByLoan(@Param('loanId') loanId: string) {
    const transactions =
      await this.transactionsService.getTransactionsByLoan(loanId);
    return ApiResponse.success(
      transactions,
      'Loan transactions retrieved successfully',
    );
  }
}
