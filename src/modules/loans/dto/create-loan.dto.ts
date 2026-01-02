import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsObject,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RepaymentFrequency, TenorPeriod } from '../../../entities/loan.entity';

export class TenorDto {
  @ApiProperty({ example: 6, description: 'Tenor value (e.g., 6 for 6 months)' })
  @IsNumber()
  @Min(1)
  value: number;

  @ApiProperty({
    example: 'MONTHS',
    description: 'Tenor period',
    enum: ['DAYS', 'WEEKS', 'MONTHS', 'YEARS'],
  })
  @IsEnum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS'])
  period: TenorPeriod;
}

export class CreateLoanDto {
  @ApiProperty({ example: 'merchant_123', description: 'Merchant ID (auto-populated from API key)', required: false })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiProperty({ example: 'customer_456', description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 50000, description: 'Principal loan amount in NGN' })
  @IsNumber()
  @Min(1)
  principalAmount: number;

  @ApiProperty({
    example: 'monthly',
    description: 'Repayment frequency',
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'bi-annually', 'annually'],
  })
  @IsEnum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'bi-annually', 'annually'])
  frequency: RepaymentFrequency;

  @ApiProperty({ type: TenorDto, description: 'Loan tenor configuration' })
  @ValidateNested()
  @Type(() => TenorDto)
  tenor: TenorDto;

  @ApiPropertyOptional({ example: 'ORD-12345', description: 'Merchant order reference' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro Max', description: 'Product description' })
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
