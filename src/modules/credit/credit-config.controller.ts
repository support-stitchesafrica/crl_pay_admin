import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { CreditConfigService } from './credit-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { ApiResponse } from '../../common/helpers/response.helper';
import { CreateCreditConfigDto, UpdateCreditConfigDto } from './dto/credit-config.dto';

@ApiTags('Credit Configuration')
@Controller('credit-config')
export class CreditConfigController {
  constructor(private readonly creditConfigService: CreditConfigService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all credit configurations' })
  @ApiResponseDecorator({ status: 200, description: 'Configurations retrieved successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async findAll() {
    try {
      const configs = await this.creditConfigService.findAll();
      return ApiResponse.success(configs, 'Configurations retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('active')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api_key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active configuration (default or financier-specific)' })
  @ApiResponseDecorator({ status: 200, description: 'Active configuration retrieved successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async getActive(@Req() request: any) {
    try {
      const financierId = request.query?.financierId;
      const config = await this.creditConfigService.getActiveConfig(financierId);
      return ApiResponse.success(config, 'Active configuration retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific credit configuration by ID' })
  @ApiResponseDecorator({ status: 200, description: 'Configuration retrieved successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Configuration not found' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    try {
      const config = await this.creditConfigService.findOne(id);
      return ApiResponse.success(config, 'Configuration retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new credit configuration' })
  @ApiResponseDecorator({ status: 201, description: 'Configuration created successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid configuration data' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async create(@Req() request: any, @Body() dto: CreateCreditConfigDto) {
    try {
      const createdBy = request.user?.email || request.user?.sub || 'admin';
      const config = await this.creditConfigService.create(dto, createdBy);
      return ApiResponse.success(config, 'Configuration created successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing credit configuration' })
  @ApiResponseDecorator({ status: 200, description: 'Configuration updated successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Configuration not found' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid configuration data' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() dto: UpdateCreditConfigDto) {
    try {
      const config = await this.creditConfigService.update(id, dto);
      return ApiResponse.success(config, 'Configuration updated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a credit configuration' })
  @ApiResponseDecorator({ status: 200, description: 'Configuration deleted successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Configuration not found' })
  @ApiResponseDecorator({ status: 400, description: 'Cannot delete default configuration' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async delete(@Param('id') id: string) {
    try {
      await this.creditConfigService.delete(id);
      return ApiResponse.success(null, 'Configuration deleted successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('cache/clear-cache')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear configuration cache' })
  @ApiResponseDecorator({ status: 200, description: 'Cache cleared successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async clearCache() {
    try {
      this.creditConfigService.clearCache();
      return ApiResponse.success(null, 'Configuration cache cleared successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
