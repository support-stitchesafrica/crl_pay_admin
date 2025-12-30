import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiResponseDecorator,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreditService } from './credit.service';
import { AssessCreditDto } from './dto/assess-credit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Credit Assessment')
@Controller('credit')
export class CreditController {
  private readonly logger = new Logger(CreditController.name);

  constructor(private readonly creditService: CreditService) {}

  @Post('assess')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Perform credit assessment for a customer (requires API key)' })
  @ApiResponseDecorator({
    status: 201,
    description: 'Credit assessment completed successfully',
  })
  @ApiResponseDecorator({ status: 400, description: 'Invalid input data' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized - Invalid API key' })
  @ApiResponseDecorator({ status: 404, description: 'Customer not found' })
  async assessCredit(@Body() assessCreditDto: AssessCreditDto) {
    this.logger.log(`POST /credit/assess - Assessing credit for customer: ${assessCreditDto.customerId}`);
    const assessment = await this.creditService.assessCredit(assessCreditDto);
    this.logger.log(`Assessment completed: ${assessment.decision} | Score: ${assessment.totalScore}`);
    return ApiResponse.success(
      assessment,
      'Credit assessment completed successfully',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credit assessment by ID' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Assessment retrieved successfully',
  })
  @ApiResponseDecorator({ status: 404, description: 'Assessment not found' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /credit/${id} - Fetching assessment`);
    const assessment = await this.creditService.findOne(id);
    this.logger.log(`Assessment found for customer: ${assessment.customerId}`);
    return ApiResponse.success(assessment, 'Assessment retrieved successfully');
  }

  @Get('customer/:customerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all assessments for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Customer assessments retrieved successfully',
  })
  async findByCustomer(@Param('customerId') customerId: string) {
    this.logger.log(`GET /credit/customer/${customerId} - Fetching customer assessments`);
    const assessments = await this.creditService.findByCustomer(customerId);
    this.logger.log(`Found ${assessments.length} assessments for customer ${customerId}`);
    return ApiResponse.success(
      assessments,
      'Customer assessments retrieved successfully',
    );
  }

  @Get('merchant/:merchantId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all assessments for a merchant' })
  @ApiParam({ name: 'merchantId', description: 'Merchant ID' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Merchant assessments retrieved successfully',
  })
  async findByMerchant(@Param('merchantId') merchantId: string) {
    this.logger.log(`GET /credit/merchant/${merchantId} - Fetching merchant assessments`);
    const assessments = await this.creditService.findByMerchant(merchantId);
    this.logger.log(`Found ${assessments.length} assessments for merchant ${merchantId}`);
    return ApiResponse.success(
      assessments,
      'Merchant assessments retrieved successfully',
    );
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credit assessment statistics (Admin only)' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats() {
    this.logger.log('GET /credit/stats/overview - Fetching assessment statistics');
    const stats = await this.creditService.getStats();
    this.logger.log(`Statistics retrieved: Total=${stats.total}, Approved=${stats.instantApprovals + stats.conditionalApprovals}`);
    return ApiResponse.success(
      stats,
      'Credit assessment statistics retrieved successfully',
    );
  }
}
