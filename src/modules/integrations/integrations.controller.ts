import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiResponse } from '../../common/helpers/response.helper';
import {
  CreatePayoutIntegrationDto,
  CreateRepaymentIntegrationDto,
  UpdateIntegrationDto,
  SetActiveIntegrationDto,
} from './dto/integration.dto';

@ApiTags('Admin - Integrations')
@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all payout integrations (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Payout integrations retrieved' })
  async getPayoutIntegrations() {
    try {
      const integrations = await this.integrationsService.getPayoutIntegrations();
      return ApiResponse.success(integrations, 'Payout integrations retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('repayments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all repayment integrations (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Repayment integrations retrieved' })
  async getRepaymentIntegrations() {
    try {
      const integrations = await this.integrationsService.getRepaymentIntegrations();
      return ApiResponse.success(integrations, 'Repayment integrations retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('payout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create payout integration (Admin only)' })
  @ApiResponseDecorator({ status: 201, description: 'Payout integration created' })
  async createPayoutIntegration(@Body() dto: CreatePayoutIntegrationDto) {
    try {
      const integration = await this.integrationsService.createPayoutIntegration(dto);
      return ApiResponse.success(integration, 'Payout integration created');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('repayments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create repayment integration (Admin only)' })
  @ApiResponseDecorator({ status: 201, description: 'Repayment integration created' })
  async createRepaymentIntegration(@Body() dto: CreateRepaymentIntegrationDto) {
    try {
      const integration = await this.integrationsService.createRepaymentIntegration(dto);
      return ApiResponse.success(integration, 'Repayment integration created');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Put('payout/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update payout integration (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Payout integration updated' })
  async updatePayoutIntegration(@Param('id') id: string, @Body() dto: UpdateIntegrationDto) {
    try {
      const integration = await this.integrationsService.updatePayoutIntegration(id, dto);
      return ApiResponse.success(integration, 'Payout integration updated');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Put('repayments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update repayment integration (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Repayment integration updated' })
  async updateRepaymentIntegration(@Param('id') id: string, @Body() dto: UpdateIntegrationDto) {
    try {
      const integration = await this.integrationsService.updateRepaymentIntegration(id, dto);
      return ApiResponse.success(integration, 'Repayment integration updated');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Delete('payout/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete payout integration (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Payout integration deleted' })
  async deletePayoutIntegration(@Param('id') id: string) {
    try {
      await this.integrationsService.deletePayoutIntegration(id);
      return ApiResponse.success(null, 'Payout integration deleted');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Delete('repayments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete repayment integration (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Repayment integration deleted' })
  async deleteRepaymentIntegration(@Param('id') id: string) {
    try {
      await this.integrationsService.deleteRepaymentIntegration(id);
      return ApiResponse.success(null, 'Repayment integration deleted');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('settings/payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active payout integration settings (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Payout settings retrieved' })
  async getPayoutSettings() {
    try {
      const settings = await this.integrationsService.getPayoutSettings();
      return ApiResponse.success(settings, 'Payout settings retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('settings/repayments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active repayment integration settings (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Repayment settings retrieved' })
  async getRepaymentSettings() {
    try {
      const settings = await this.integrationsService.getRepaymentSettings();
      return ApiResponse.success(settings, 'Repayment settings retrieved');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Put('settings/payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set active payout integration (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Active payout integration set' })
  async setActivePayoutIntegration(@Body() dto: SetActiveIntegrationDto) {
    try {
      const settings = await this.integrationsService.setActivePayoutIntegration(dto);
      return ApiResponse.success(settings, 'Active payout integration set');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Put('settings/repayments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set active repayment integration (Admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Active repayment integration set' })
  async setActiveRepaymentIntegration(@Body() dto: SetActiveIntegrationDto) {
    try {
      const settings = await this.integrationsService.setActiveRepaymentIntegration(dto);
      return ApiResponse.success(settings, 'Active repayment integration set');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
