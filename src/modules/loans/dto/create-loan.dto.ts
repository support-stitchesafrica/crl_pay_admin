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
import type { RepaymentFrequency, TenorPeriod } from '../../../entities/loan.entity';

export class TenorDto {
  @IsNumber()
  @Min(1)
  value: number;

  @IsEnum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS'])
  period: TenorPeriod;
}

export class CreateLoanDto {
  @IsString()
  merchantId: string;

  @IsString()
  customerId: string;

  @IsNumber()
  @Min(1)
  principalAmount: number;

  @IsEnum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'bi-annually', 'annually'])
  frequency: RepaymentFrequency;

  @ValidateNested()
  @Type(() => TenorDto)
  tenor: TenorDto;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  productDescription?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
