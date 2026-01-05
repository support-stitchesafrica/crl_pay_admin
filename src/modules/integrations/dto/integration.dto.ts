import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { IntegrationProvider, IntegrationMode, IntegrationStatus } from '../../../entities/integration.entity';

export class CreatePayoutIntegrationDto {
  @ApiProperty({ enum: ['paystack', 'flutterwave', 'stripe'], example: 'paystack' })
  @IsEnum(['paystack', 'flutterwave', 'stripe'])
  provider: IntegrationProvider;

  @ApiProperty({ enum: ['test', 'live'], example: 'test' })
  @IsEnum(['test', 'live'])
  mode: IntegrationMode;

  @ApiProperty({ example: 'Paystack - Main NGN (Test)' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 'PAYSTACK_SECRET_KEY_TEST', description: 'Environment variable name containing the secret key' })
  @IsString()
  @IsNotEmpty()
  secretKeyEnvRef: string;

  @ApiProperty({ example: 'PAYSTACK_WEBHOOK_SECRET', required: false })
  @IsOptional()
  @IsString()
  webhookSecretEnvRef?: string;
}

export class CreateRepaymentIntegrationDto {
  @ApiProperty({ enum: ['paystack', 'flutterwave', 'stripe'], example: 'paystack' })
  @IsEnum(['paystack', 'flutterwave', 'stripe'])
  provider: IntegrationProvider;

  @ApiProperty({ enum: ['test', 'live'], example: 'test' })
  @IsEnum(['test', 'live'])
  mode: IntegrationMode;

  @ApiProperty({ example: 'Paystack - Cards (Test)' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 'PAYSTACK_SECRET_KEY_TEST' })
  @IsString()
  @IsNotEmpty()
  secretKeyEnvRef: string;

  @ApiProperty({ example: 'PAYSTACK_WEBHOOK_SECRET', required: false })
  @IsOptional()
  @IsString()
  webhookSecretEnvRef?: string;
}

export class UpdateIntegrationDto {
  @ApiProperty({ example: 'Paystack - Main NGN (Live)', required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ enum: ['active', 'inactive'], required: false })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: IntegrationStatus;

  @ApiProperty({ example: 'PAYSTACK_SECRET_KEY_LIVE', required: false })
  @IsOptional()
  @IsString()
  secretKeyEnvRef?: string;

  @ApiProperty({ example: 'PAYSTACK_WEBHOOK_SECRET', required: false })
  @IsOptional()
  @IsString()
  webhookSecretEnvRef?: string;
}

export class SetActiveIntegrationDto {
  @ApiProperty({ example: 'paystack-main-live' })
  @IsString()
  @IsNotEmpty()
  integrationId: string;
}
