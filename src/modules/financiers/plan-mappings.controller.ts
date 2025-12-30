import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanMappingsService } from './plan-mappings.service';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Plan Merchant Mappings')
@Controller('plan-merchant-mappings')
export class PlanMappingsController {
  constructor(private planMappingsService: PlanMappingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all plan-merchant mappings' })
  async getMappings(
    @Query('planId') planId?: string,
    @Query('merchantId') merchantId?: string,
    @Query('financierId') financierId?: string,
  ) {
    try {
      const mappings = await this.planMappingsService.getMappings({
        planId,
        merchantId,
        financierId,
      });
      return ApiResponse.success(mappings, 'Mappings retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':mappingId')
  @ApiOperation({ summary: 'Get mapping by ID' })
  async getMappingById(@Param('mappingId') mappingId: string) {
    try {
      const mapping = await this.planMappingsService.getMappingById(mappingId);
      return ApiResponse.success(mapping, 'Mapping retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create plan-merchant mapping (Admin only)' })
  async createMapping(
    @Body() data: {
      planId: string;
      merchantId: string;
      fundsAllocated: number;
      expirationDate: string;
    },
  ) {
    return this.planMappingsService.createMapping(data);
  }

  @Put(':mappingId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update plan-merchant mapping (Admin only)' })
  async updateMapping(
    @Param('mappingId') mappingId: string,
    @Body() data: { fundsAllocated?: number; status?: string },
  ) {
    return this.planMappingsService.updateMapping(mappingId, data);
  }

  @Delete(':mappingId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete plan-merchant mapping (Admin only)' })
  async deleteMapping(@Param('mappingId') mappingId: string) {
    return this.planMappingsService.deleteMapping(mappingId);
  }
}
