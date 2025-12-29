import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, VerifyOTPDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { ApiResponse } from '../../common/helpers/response.helper';

@ApiTags('Auth')
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

  // Merchant Forgot Password Endpoints
  @Post('merchant/forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to merchant email for password reset' })
  @ApiResponseDecorator({ status: 200, description: 'OTP sent successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Merchant not found' })
  async merchantForgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      await this.authService.sendPasswordResetOTP(dto.email, 'merchant');
      return ApiResponse.success(null, 'OTP has been sent to your email address');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('merchant/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for merchant password reset' })
  @ApiResponseDecorator({ status: 200, description: 'OTP verified successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid or expired OTP' })
  async merchantVerifyOTP(@Body() dto: VerifyOTPDto) {
    try {
      await this.authService.verifyPasswordResetOTP(dto.email, dto.otp, 'merchant');
      return ApiResponse.success(null, 'OTP verified successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('merchant/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset merchant password with verified OTP' })
  @ApiResponseDecorator({ status: 200, description: 'Password reset successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid OTP or OTP not verified' })
  async merchantResetPassword(@Body() dto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(dto.email, dto.otp, dto.newPassword, 'merchant');
      return ApiResponse.success(null, 'Password has been reset successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  // Admin Forgot Password Endpoints
  @Post('admin/forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to admin email for password reset' })
  @ApiResponseDecorator({ status: 200, description: 'OTP sent successfully' })
  @ApiResponseDecorator({ status: 404, description: 'Admin not found' })
  async adminForgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      await this.authService.sendPasswordResetOTP(dto.email, 'admin');
      return ApiResponse.success(null, 'OTP has been sent to your email address');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('admin/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for admin password reset' })
  @ApiResponseDecorator({ status: 200, description: 'OTP verified successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid or expired OTP' })
  async adminVerifyOTP(@Body() dto: VerifyOTPDto) {
    try {
      await this.authService.verifyPasswordResetOTP(dto.email, dto.otp, 'admin');
      return ApiResponse.success(null, 'OTP verified successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }

  @Post('admin/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset admin password with verified OTP' })
  @ApiResponseDecorator({ status: 200, description: 'Password reset successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Invalid OTP or OTP not verified' })
  async adminResetPassword(@Body() dto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(dto.email, dto.otp, dto.newPassword, 'admin');
      return ApiResponse.success(null, 'Password has been reset successfully');
    } catch (error) {
      return ApiResponse.error(error.message, error);
    }
  }
}
