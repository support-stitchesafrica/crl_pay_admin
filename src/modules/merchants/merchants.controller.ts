import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { ApproveMerchantDto } from './dto/approve-merchant.dto';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new merchant' })
  @ApiResponseDecorator({ status: 201, description: 'Merchant registered successfully' })
  @ApiResponseDecorator({ status: 409, description: 'Merchant already exists' })
  async register(@Body() createMerchantDto: CreateMerchantDto) {
    try {
      const merchant = await this.merchantsService.create(createMerchantDto);
      return ApiResponse.success(
        merchant,
        'Merchant registered successfully. Your application is pending approval.',
      );
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all merchants (admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Merchants retrieved successfully' })
  async findAll(@Query('status') status?: string) {
    try {
      const merchants = await this.merchantsService.findAll(status);
      return ApiResponse.success(merchants, 'Merchants retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get merchant statistics (admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    try {
      const stats = await this.merchantsService.getMerchantStats();
      return ApiResponse.success(stats, 'Statistics retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a merchant by ID' })
  @ApiResponseDecorator({ status: 200, description: 'Merchant retrieved successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Merchant not found' })
  async findOne(@Param('id') id: string) {
    try {
      const merchant = await this.merchantsService.findOne(id);
      return ApiResponse.success(merchant, 'Merchant retrieved successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update merchant profile' })
  @ApiResponseDecorator({ status: 200, description: 'Merchant updated successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Merchant not found' })
  async update(@Param('id') id: string, @Body() updateMerchantDto: UpdateMerchantDto) {
    try {
      const merchant = await this.merchantsService.update(id, updateMerchantDto);
      return ApiResponse.success(merchant, 'Merchant updated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve or reject merchant (admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Merchant status updated successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Merchant not found' })
  async approve(
    @Param('id') id: string,
    @Body() approveMerchantDto: ApproveMerchantDto,
    @Request() req: any,
  ) {
    try {
      // TODO: Get admin ID from JWT token
      const adminId = req.user?.adminId || 'system';
      const merchant = await this.merchantsService.approve(id, approveMerchantDto, adminId);
      return ApiResponse.success(merchant, 'Merchant status updated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a merchant (admin only)' })
  @ApiResponseDecorator({ status: 200, description: 'Merchant deleted successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Merchant not found' })
  async remove(@Param('id') id: string) {
    try {
      await this.merchantsService.remove(id);
      return ApiResponse.success(null, 'Merchant deleted successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
