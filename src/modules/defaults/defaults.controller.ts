import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
import { DefaultsService } from './defaults.service';
import {
  RecordContactAttemptDto,
  CreatePaymentPlanDto,
  UpdateDefaultDto,
  DefaultQueryDto,
  WriteOffDto,
} from './dto/default.dto';
import { ApiResponse } from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Defaults')
@Controller('defaults')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DefaultsController {
  constructor(private readonly defaultsService: DefaultsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all defaults with filters' })
  @ApiResponseDecorator({ status: 200, description: 'Defaults retrieved successfully' })
  async findAll(@Query() query: DefaultQueryDto) {
    try {
      const defaults = await this.defaultsService.findAll(query);
      return ApiResponse.success(defaults, 'Defaults retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get default statistics' })
  @ApiResponseDecorator({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('merchantId') merchantId?: string) {
    try {
      const stats = await this.defaultsService.getStats(merchantId);
      return ApiResponse.success(stats, 'Statistics retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get default by ID' })
  @ApiResponseDecorator({ status: 200, description: 'Default retrieved successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Default not found' })
  async findOne(@Param('id') id: string) {
    try {
      const defaultRecord = await this.defaultsService.findOne(id);
      return ApiResponse.success(defaultRecord, 'Default retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('loan/:loanId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get default by loan ID' })
  @ApiResponseDecorator({ status: 200, description: 'Default retrieved successfully' })
  async findByLoanId(@Param('loanId') loanId: string) {
    try {
      const defaultRecord = await this.defaultsService.findByLoanId(loanId);
      return ApiResponse.success(defaultRecord, 'Default retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update default' })
  @ApiResponseDecorator({ status: 200, description: 'Default updated successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Default not found' })
  async update(@Param('id') id: string, @Body() updateDefaultDto: UpdateDefaultDto) {
    try {
      const defaultRecord = await this.defaultsService.update(id, updateDefaultDto);
      return ApiResponse.success(defaultRecord, 'Default updated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a contact attempt' })
  @ApiResponseDecorator({ status: 200, description: 'Contact attempt recorded' })
  @ApiResponseDecorator({ status: 404, description: 'Default not found' })
  async recordContact(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordContactAttemptDto,
  ) {
    try {
      const agentId = req.user?.sub || req.user?.merchantId;
      const defaultRecord = await this.defaultsService.recordContactAttempt(id, dto, agentId);
      return ApiResponse.success(defaultRecord, 'Contact attempt recorded');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/payment-plan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment plan for restructuring' })
  @ApiResponseDecorator({ status: 201, description: 'Payment plan created' })
  @ApiResponseDecorator({ status: 400, description: 'Bad request' })
  @ApiResponseDecorator({ status: 404, description: 'Default not found' })
  async createPaymentPlan(@Param('id') id: string, @Body() dto: CreatePaymentPlanDto) {
    try {
      const defaultRecord = await this.defaultsService.createPaymentPlan(id, dto);
      return ApiResponse.success(defaultRecord, 'Payment plan created');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/report-credit-bureau')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report default to credit bureau' })
  @ApiResponseDecorator({ status: 200, description: 'Reported to credit bureau' })
  @ApiResponseDecorator({ status: 400, description: 'Already reported' })
  @ApiResponseDecorator({ status: 404, description: 'Default not found' })
  async reportToCreditBureau(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    try {
      const defaultRecord = await this.defaultsService.reportToCreditBureau(id, reason);
      return ApiResponse.success(defaultRecord, 'Reported to credit bureau');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/write-off')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Write off a default as uncollectable' })
  @ApiResponseDecorator({ status: 200, description: 'Default written off' })
  @ApiResponseDecorator({ status: 404, description: 'Default not found' })
  async writeOff(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    try {
      const agentId = req.user?.sub || req.user?.merchantId;
      const defaultRecord = await this.defaultsService.writeOff(id, reason, agentId);
      return ApiResponse.success(defaultRecord, 'Default written off');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a default (mark as paid)' })
  @ApiResponseDecorator({ status: 200, description: 'Default resolved' })
  @ApiResponseDecorator({ status: 404, description: 'Default not found' })
  async resolve(
    @Request() req: any,
    @Param('id') id: string,
    @Body('details') details?: string,
  ) {
    try {
      const agentId = req.user?.sub || req.user?.merchantId;
      const defaultRecord = await this.defaultsService.resolve(id, details, agentId);
      return ApiResponse.success(defaultRecord, 'Default resolved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
