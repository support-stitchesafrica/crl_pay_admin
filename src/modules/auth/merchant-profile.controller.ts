import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MerchantsService } from '../merchants/merchants.service';
import { UpdateMerchantProfileDto } from '../merchants/dto/update-profile.dto';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Merchant Profile')
@Controller('merchants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MerchantProfileController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get merchant profile' })
  @ApiResponseDecorator({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    try {
      // Extract merchantId from JWT token
      const merchantId = req.user?.sub || req.user?.merchantId;

      console.log('getProfile - req.user:', req.user);
      console.log('getProfile - merchantId:', merchantId);

      if (!merchantId) {
        throw new Error('Merchant ID not found in token');
      }

      const merchant = await this.merchantsService.findOne(merchantId);

      // Remove sensitive data
      if (merchant) {
        const { passwordHash, apiSecret, ...safeProfile } = merchant;
        return ApiResponse.success(safeProfile, 'Profile retrieved successfully');
      }

      return ApiResponse.success(merchant, 'Profile retrieved successfully');
    } catch (error) {
      console.error('getProfile error:', error);
      return ApiResponse.error(error.message, error);
    }
  }

  @Put('me')
  @ApiOperation({ summary: 'Update merchant profile' })
  @ApiResponseDecorator({ status: 200, description: 'Profile updated successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() updateDto: UpdateMerchantProfileDto) {
    try {
      const merchantId = req.user?.sub || req.user?.merchantId;
      const merchant = await this.merchantsService.updateProfile(merchantId, updateDto);

      // Remove sensitive data
      if (merchant) {
        const { passwordHash, apiSecret, ...safeProfile } = merchant;
        return ApiResponse.success(safeProfile, 'Profile updated successfully');
      }

      return ApiResponse.success(merchant, 'Profile updated successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
