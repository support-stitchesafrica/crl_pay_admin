import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('merchant/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merchant login' })
  @ApiResponseDecorator({ status: 200, description: 'Login successful' })
  @ApiResponseDecorator({ status: 401, description: 'Invalid credentials' })
  async merchantLogin(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.merchantLogin(loginDto.email, loginDto.password);
      return ApiResponse.success(result, 'Login successful');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponseDecorator({ status: 200, description: 'Login successful' })
  @ApiResponseDecorator({ status: 401, description: 'Invalid credentials' })
  async adminLogin(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.adminLogin(loginDto.email, loginDto.password);
      return ApiResponse.success(result, 'Login successful');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
